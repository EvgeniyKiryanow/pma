import { app, contextBridge, ipcMain, ipcRenderer, shell } from 'electron';
import { CommentOrHistoryEntry, User } from './types/user';
import path from 'path';
import fs from 'fs/promises';

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

    getDbColums: () => ipcRenderer.invoke('users:get-db-columns'),

    // History
    getUserHistory: (userId: number, filter: string) =>
        ipcRenderer.invoke('history:get-user-history', userId, filter),
    addUserHistory: (userId: number, newEntry: any) =>
        ipcRenderer.invoke('history:add-entry', userId, newEntry),
    deleteUserHistory: (id: number) => ipcRenderer.invoke('deleteUserHistory', id),
    editUserHistory: (userId: number, updatedEntry: CommentOrHistoryEntry) =>
        ipcRenderer.invoke('history:edit-entry', userId, updatedEntry),

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
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // clear token
    onClearToken: (callback: () => void) => ipcRenderer.on('clear-auth-token', callback),

    // todo
    getTodos: () => ipcRenderer.invoke('fetch-todos'),
    addTodo: (content: string) => ipcRenderer.invoke('add-todos', content),
    toggleTodo: (id: number) => ipcRenderer.invoke('toggle-todos', id),
    deleteTodo: (id: number) => ipcRenderer.invoke('delete-todos', id),

    //reports
    shtatni: {
        fetchAll: () => ipcRenderer.invoke('fetch-shtatni-posady'),
        import: (positions: any[]) => ipcRenderer.invoke('import-shtatni-posady', positions),
        update: (pos: any) => ipcRenderer.invoke('update-shtatni-posada', pos),
        delete: (shtat_number: string) => ipcRenderer.invoke('delete-shtatni-posada', shtat_number),
        deleteAll: () => ipcRenderer.invoke('delete-all-shtatni-posady'),
    },
    getAllReportTemplates: async () => {
        return await ipcRenderer.invoke('get-all-report-templates');
    },
    convertDocxToPdf: (buffer: ArrayBuffer, fileName: string) =>
        ipcRenderer.invoke('convert-docx-to-pdf', buffer, fileName),

    // SQLite-backed templates
    saveReportFileToDisk: (buffer: ArrayBuffer, name: string) =>
        ipcRenderer.invoke('save-report-file-to-disk', buffer, name),
    addReportTemplateToDb: (name: string, filePath: string) =>
        ipcRenderer.invoke('add-report-template', name, filePath),
    deleteReportTemplateFromDb: (id: number) => ipcRenderer.invoke('delete-report-template', id),
    getReportTemplatesFromDb: () => ipcRenderer.invoke('get-all-report-templates-from-db'),
    readReportFileBuffer: (filePath: string) =>
        ipcRenderer.invoke('read-report-file-buffer', filePath),

    // puthon parser
    morphy: {
        analyzeWords: (words: string[]) => ipcRenderer.invoke('analyze-words', words),
    },

    //close
    closeApp: () => ipcRenderer.send('app:close'),
    hideApp: () => ipcRenderer.invoke('hide-app'),
});
