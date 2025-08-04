import { app, contextBridge, ipcMain, ipcRenderer, shell } from 'electron';
import { CommentOrHistoryEntry, User } from './types/user';
import path from 'path';
import fs from 'fs/promises';

contextBridge.exposeInMainWorld('electronAPI', {
    loadHistoryFile: (userId: number, entryId: number, filename: string) =>
        ipcRenderer.invoke('history:load-file', userId, entryId, filename),
    fetchUsersMetadata: () => ipcRenderer.invoke('fetch-users-metadata'),

    // DB
    downloadDb: () => ipcRenderer.invoke('download-db'),
    replaceDb: () => ipcRenderer.invoke('replace-db'),
    downloadDbSafe: (password: any) => ipcRenderer.invoke('download-db-safe', password),
    restoreDbSafe: (password: any) => ipcRenderer.invoke('restore-db-safe', password),
    restoreDb: () => ipcRenderer.invoke('restore-db'),
    resetDb: () => ipcRenderer.invoke('reset-db'),
    setBackupIntervalInDays: (days: number) => ipcRenderer.invoke('backup:set-interval', days),
    getBackupIntervalInDays: () => ipcRenderer.invoke('backup:get-interval'),
    getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
    getBackupPath: () => ipcRenderer.invoke('backup:get-backup-path'),
    // New shared directives methods
    directives: {
        add: (entry: {
            userId: number;
            type: 'order' | 'exclude' | 'restore';
            title: string;
            description?: string;
            file: any;
            date: string;
            period?: { from: string; to?: string };
        }) => ipcRenderer.invoke('directives:add', entry),

        getAllByType: (type: 'order' | 'exclude' | 'restore') =>
            ipcRenderer.invoke('directives:getAllByType', type),

        deleteById: (id: number) => ipcRenderer.invoke('directives:deleteById', id),

        delete: (params: { userId: number; date: string }) =>
            ipcRenderer.invoke('directives:delete', params),

        clearByType: (type: 'order' | 'exclude' | 'restore') =>
            ipcRenderer.invoke('directives:clearByType', type),
    },

    // User CRUD
    fetchUsers: () => ipcRenderer.invoke('fetch-users'),
    addUser: (user: User) => ipcRenderer.invoke('add-user', user),
    updateUser: (user: User) => ipcRenderer.invoke('update-user', user),
    deleteUser: (id: any) => ipcRenderer.invoke('delete-user', id),
    bulkUpdateUsers: (users: any) => ipcRenderer.invoke('bulkUpdateUsers', users),
    getDbColums: () => ipcRenderer.invoke('users:get-db-columns'),

    // History
    getUserHistory: (userId: number, filter: string) =>
        ipcRenderer.invoke('history:get-user-history', userId, filter),
    addUserHistory: (userId: number, newEntry: any) =>
        ipcRenderer.invoke('history:add-entry', userId, newEntry),
    deleteUserHistory: (id: number) => ipcRenderer.invoke('deleteUserHistory', id),
    editUserHistory: (userId: number, updatedEntry: CommentOrHistoryEntry) =>
        ipcRenderer.invoke('history:edit-entry', userId, updatedEntry),
    getUserHistoryByRange: (userId: any, range: any) =>
        ipcRenderer.invoke('history:getByUserAndRange', userId, range),

    // Auth
    hasUser: () => ipcRenderer.invoke('auth:has-user'),
    register: (u: string, p: string, h: string) => ipcRenderer.invoke('auth:register', u, p, h),
    login: (u: string, p: string) => ipcRenderer.invoke('auth:login', u, p),
    getRecoveryHint: (u: string) => ipcRenderer.invoke('auth:get-recovery-hint', u),
    resetPassword: (u: string, h: string, np: string) =>
        ipcRenderer.invoke('auth:reset-password', u, h, np),
    superuserLogin: (username: string, password: string): Promise<string | false> =>
        ipcRenderer.invoke('auth:superuser-login', username, password),
    defaultAdminLogin: (username: string, password: string): Promise<string | false> =>
        ipcRenderer.invoke('auth:default-admin-login', username, password),
    // Auth Management
    getAuthUsers: () => ipcRenderer.invoke('auth:get-auth-users'),
    updateAuthUser: (
        userId: number,
        updates: Partial<{
            username: string;
            password: string;
            recovery_hint: string;
            role: string;
        }>,
    ) => ipcRenderer.invoke('auth:update-auth-user', userId, updates),

    getDefaultAdmin: () => ipcRenderer.invoke('auth:get-default-admin'),
    updateDefaultAdmin: (
        updates: Partial<{
            username: string;
            password: string;
            recovery_hint: string;
        }>,
    ) => ipcRenderer.invoke('auth:update-default-admin', updates),

    // APPKEY
    appKey: () => ipcRenderer.invoke('app:get-key'),

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

    //Screen
    closeApp: () => ipcRenderer.send('app:close'),
    hideApp: () => ipcRenderer.invoke('hide-app'),
    toggleFullScreen: () => ipcRenderer.send('app:toggle-fullscreen'),

    // LOGS
    exportChangeLogs: (password: string) => ipcRenderer.invoke('change-history:export', password),
    importChangeLogs: (password: string) => ipcRenderer.invoke('change-history:import', password),
    changeHistory: {
        log: (change: {
            table: string;
            recordId: number;
            operation: string;
            data?: any;
            sourceId?: string;
        }) => ipcRenderer.invoke('change-history:log', change),
    },
    users: {
        getOne: (id: number) => ipcRenderer.invoke('users:get-one', id),
    },
});
