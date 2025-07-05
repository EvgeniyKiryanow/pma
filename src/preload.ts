import { contextBridge, ipcRenderer } from 'electron';
import { User } from './types/user';

contextBridge.exposeInMainWorld('electronAPI', {
    downloadDb: () => ipcRenderer.invoke('download-db'),
    replaceDb: () => ipcRenderer.invoke('replace-db'),
    restoreDb: () => ipcRenderer.invoke('restore-db'),
    fetchUsers: () => ipcRenderer.invoke('fetch-users'),
    addUser: (user: User) => ipcRenderer.invoke('add-user', user),
    updateUser: (user: User) => ipcRenderer.invoke('update-user', user),
    deleteUser: (id: number) => ipcRenderer.invoke('delete-user', id),
});
