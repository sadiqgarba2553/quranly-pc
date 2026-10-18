const { app, BrowserWindow, Menu, protocol, net, shell, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { resolveAsset, isExternalUrl, APP_ORIGIN } = require('./security.cjs');
if (!app.isPackaged && process.env.QURANLY_TEST_PROFILE) app.setPath('userData', process.env.QURANLY_TEST_PROFILE);
if (app.commandLine.hasSwitch('user-data-dir')) app.setPath('userData', path.resolve(app.commandLine.getSwitchValue('user-data-dir')));

protocol.registerSchemesAsPrivileged([{ scheme: 'quranly', privileges: {
  standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true,
} }]);
let mainWindow;
const devUrl = !app.isPackaged && process.env.QURANLY_DEV_URL;
const trusted = url => url.startsWith(`${APP_ORIGIN}/`) || (devUrl && new URL(url).origin === new URL(devUrl).origin);
const external = url => { if (isExternalUrl(url)) shell.openExternal(url).catch(console.error); };

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360, height: 900, minWidth: 850, minHeight: 620, show: false,
    title: 'Quranly', backgroundColor: '#111113', icon: path.join(__dirname, '../dist/logo.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false,
      contextIsolation: true, sandbox: true, webSecurity: true, spellcheck: true },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!trusted(url)) { event.preventDefault(); external(url); }
  });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.webContents.on('render-process-gone', () => {
    dialog.showMessageBox(mainWindow, { type: 'error', message: 'Quranly needs to reload',
      detail: 'Your saved listening progress is kept on this device.', buttons: ['Reload', 'Close'] })
      .then(({ response }) => response === 0 ? mainWindow.reload() : mainWindow.close());
  });
  mainWindow.loadURL(devUrl ? `${devUrl}/#/app` : `${APP_ORIGIN}/index.html#/app`);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
  app.whenReady().then(() => {
    app.setAppUserModelId('com.bluecloud.quranly');
    const root = path.join(app.getAppPath(), 'dist');
    protocol.handle('quranly', async request => {
      const asset = resolveAsset(root, request.url);
      if (!asset) return new Response('Not found', { status: 404 });
      try { return await net.fetch(pathToFileURL(asset).href); }
      catch { return new Response('Not found', { status: 404 }); }
    });
    const { session } = require('electron');
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
      if (trusted(contents.getURL()) && ['notifications', 'geolocation'].includes(permission)) {
        dialog.showMessageBox(mainWindow, { type: 'question', buttons: ['Allow', 'Not now'], defaultId: 1, cancelId: 1,
          message: permission === 'notifications' ? 'Allow Quranly prayer notifications?' : 'Allow Quranly to use your location?',
          detail: permission === 'notifications' ? 'Prayer reminders work while the app is open.' : 'Your location is used to calculate prayer times and Qibla. You can choose a city instead.'
        }).then(({response}) => callback(response === 0)).catch(() => callback(false));
        return;
      }
      callback(trusted(contents.getURL()) && ['clipboard-sanitized-write', 'fullscreen'].includes(permission));
    });
    session.defaultSession.setPermissionCheckHandler((contents, permission) =>
      Boolean(contents && trusted(contents.getURL()) && ['clipboard-sanitized-write', 'fullscreen'].includes(permission)));
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      if (!details.url.startsWith(APP_ORIGIN)) return callback({ responseHeaders: details.responseHeaders });
      callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss:; media-src 'self' blob: https:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-src 'none'",
      ] } });
    });
    ipcMain.handle('app:version', event => { if (!trusted(event.senderFrame.url)) throw Error('Untrusted sender'); return app.getVersion(); });
    ipcMain.handle('backup:export', async (event, text) => {
      if (!trusted(event.senderFrame.url) || typeof text !== 'string' || text.length > 10_000_000) throw Error('Invalid backup');
      JSON.parse(text);
      const result = await dialog.showSaveDialog(mainWindow, { defaultPath: `Quranly-backup-${new Date().toISOString().slice(0,10)}.json`, filters: [{ name: 'Quranly backup', extensions: ['json'] }] });
      if (result.canceled) return false;
      await fs.writeFile(result.filePath, text, 'utf8'); return true;
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Quranly', submenu: [{ label: 'About Quranly', click: () => dialog.showMessageBox(mainWindow, { message: `Quranly ${app.getVersion()}`, detail: 'Your companion for reading, listening and reflection.' }) }, { type: 'separator' }, { role: 'quit' }] },
      { role: 'editMenu' },
      { label: 'View', submenu: [{ role: 'reload' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }, ...(!app.isPackaged ? [{ role: 'toggleDevTools' }] : [])] },
    ]));
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => app.quit());
}
