const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('quranlyDesktop', {
  platform: 'windows',
  getVersion: () => ipcRenderer.invoke('app:version'),
  exportBackup: text => ipcRenderer.invoke('backup:export', text),
});
