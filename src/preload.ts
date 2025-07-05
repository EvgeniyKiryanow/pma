import { app, contextBridge, ipcRenderer, shell } from 'electron';
import { CommentOrHistoryEntry, User } from './types/user';

contextBridge.exposeInMainWorld('electronAPI', {
    // DB
    downloadDb: () => ipcRenderer.invoke('download-db'),
    replaceDb: () => ipcRenderer.invoke('replace-db'),
    restoreDb: () => ipcRenderer.invoke('restore-db'),
    resetDb: () => ipcRenderer.invoke('reset-db'),
    setBackupIntervalInDays: (days: number) => ipcRenderer.invoke('backup:set-interval', days),
    getBackupIntervalInDays: () => ipcRenderer.invoke('backup:get-interval'),
    getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
    getBackupPath: () => ipcRenderer.invoke('backup:get-backup-path'),

    // User CRUD
    fetchUsers: () => ipcRenderer.invoke('fetch-users'),
    addUser: (user: User) => ipcRenderer.invoke('add-user', user),
    updateUser: (user: User) => ipcRenderer.invoke('update-user', user),
    deleteUser: (id: any) => ipcRenderer.invoke('delete-user', id),

    // History
    getUserHistory: (userId: number, filter: string) =>
        ipcRenderer.invoke('history:get-user-history', userId, filter),
    addUserHistory: (userId: number, newEntry: any) =>
        ipcRenderer.invoke('history:add-entry', userId, newEntry),
    deleteUserHistory: (id: number) => ipcRenderer.invoke('deleteUserHistory', id),

    // Auth
    hasUser: () => ipcRenderer.invoke('auth:has-user'),
    register: (u: string, p: string, h: string) => ipcRenderer.invoke('auth:register', u, p, h),
    login: (u: string, p: string) => ipcRenderer.invoke('auth:login', u, p),
    getRecoveryHint: (u: string) => ipcRenderer.invoke('auth:get-recovery-hint', u),
    resetPassword: (u: string, h: string, np: string) =>
        ipcRenderer.invoke('auth:reset-password', u, h, np),

    // Comments
    getUserComments: (userId: number) => ipcRenderer.invoke('comments:get-user-comments', userId),
    addUserComment: (userId: number, comment: CommentOrHistoryEntry) =>
        ipcRenderer.invoke('comments:add-user-comment', userId, comment),
    deleteUserComment: (id: number) => ipcRenderer.invoke('comments:delete-user-comment', id),

    // Version
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // clear token
    onClearToken: (callback: () => void) => ipcRenderer.on('clear-auth-token', callback),
});
