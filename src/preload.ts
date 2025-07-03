import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    downloadDb: () => ipcRenderer.invoke('download-db'),
});
