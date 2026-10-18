const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('quranlyDesktop', {
  platform: 'windows',
  getVersion: () => ipcRenderer.invoke('app:version'),
  exportBackup: text => ipcRenderer.invoke('backup:export', text),
  collections: {
    list: () => ipcRenderer.invoke('collections:list'),
    estimate: spec => ipcRenderer.invoke('collections:estimate', spec),
    start: spec => ipcRenderer.invoke('collections:start', spec),
    pause: id => ipcRenderer.invoke('collections:pause', id),
    resume: id => ipcRenderer.invoke('collections:resume', id),
    remove: id => ipcRenderer.invoke('collections:remove', id),
    audio: url => ipcRenderer.invoke('collections:audio', url),
    subscribe: listener => { const handler=(_event,jobs)=>listener(jobs);ipcRenderer.on('collections:changed',handler);return()=>ipcRenderer.removeListener('collections:changed',handler); },
  },
});
