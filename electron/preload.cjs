const { contextBridge, ipcRenderer } = require('electron');

// Pont sécurisé : la page web ne voit que ces trois fonctions.
contextBridge.exposeInMainWorld('lennyxSync', {
  start: (payload) => ipcRenderer.invoke('lennyx-sync-start', payload),
  stop: () => ipcRenderer.invoke('lennyx-sync-stop'),
  update: (payload) => ipcRenderer.invoke('lennyx-sync-update', payload),
  onIncoming: (cb) => {
    const handler = (_e, body) => cb(body);
    ipcRenderer.on('lennyx-sync-incoming', handler);
    return () => ipcRenderer.removeListener('lennyx-sync-incoming', handler);
  },
});
