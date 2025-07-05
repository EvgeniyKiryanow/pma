import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    downloadDb: () => ipcRenderer.invoke('download-db'),
    fetchUsers: () => ipcRenderer.invoke('fetch-users'),
});
