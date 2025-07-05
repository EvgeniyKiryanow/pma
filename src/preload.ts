import { contextBridge, ipcRenderer } from 'electron';
import { User } from './types/user';

contextBridge.exposeInMainWorld('electronAPI', {
    // DB
    downloadDb: () => ipcRenderer.invoke('download-db'),
    replaceDb: () => ipcRenderer.invoke('replace-db'),
    restoreDb: () => ipcRenderer.invoke('restore-db'),
    resetDb: () => ipcRenderer.invoke('reset-db'),
    setBackupIntervalInDays: (days: number) => ipcRenderer.invoke('backup:set-interval', days),
    getBackupIntervalInDays: () => ipcRenderer.invoke('backup:get-interval'),
    getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

    // User CRUD
    fetchUsers: () => ipcRenderer.invoke('fetch-users'),
    addUser: (user: User) => ipcRenderer.invoke('add-user', user),
    updateUser: (user: User) => ipcRenderer.invoke('update-user', user),
    deleteUser: (id: any) => ipcRenderer.invoke('delete-user', id),

    // Auth
    hasUser: () => ipcRenderer.invoke('auth:has-user'),
    register: (u: string, p: string, h: string) => ipcRenderer.invoke('auth:register', u, p, h),
    login: (u: string, p: string) => ipcRenderer.invoke('auth:login', u, p),
    getRecoveryHint: (u: string) => ipcRenderer.invoke('auth:get-recovery-hint', u),
    resetPassword: (u: string, h: string, np: string) =>
        ipcRenderer.invoke('auth:reset-password', u, h, np),
});
