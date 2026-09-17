import { contextBridge, ipcRenderer } from 'electron';

import type { AuditPage, AuditQuery } from '../shared/audit/types';
import type {
    AccountDTO,
    AuthState,
    CreateAccountInput,
    RoleDTO,
    RoleInput,
    SessionInfo,
    SetupInput,
    UpdateAccountInput,
} from '../shared/auth/types';
import type {
    AutoBackupSettings,
    BackupSettings,
    ExportResult,
    ImportInspection,
    ImportSelection,
    RestoreResult,
    SnapshotInfo,
} from '../shared/backup/types';
import {
    ACCOUNT_CHANNELS,
    AUTH_CHANNELS,
    AUTH_EVENTS,
    BACKUP_CHANNELS,
    ROLE_CHANNELS,
} from '../shared/ipc/channels';
import type { Result } from '../shared/ipc/result';
import type { ShtatnaPosada } from '../shared/types/shtatnaPosada';
import type { CommentOrHistoryEntry, User } from '../shared/types/user';

/**
 * The only bridge between the renderer and the main process. Types declared here are the
 * contract used by the renderer (`window.electronAPI`), so they are defined exactly once.
 * Every channel is authorized in the main process; nothing here is trusted.
 */

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> =>
    ipcRenderer.invoke(channel, ...args) as Promise<T>;

type DirectiveType = 'order' | 'exclude' | 'restore';
type DirectiveInput = {
    userId: number;
    type: DirectiveType;
    title: string;
    description?: string;
    file: any;
    date: string;
    period?: { from: string; to?: string };
};
type DirectiveRecord = {
    id: number;
    userId: number;
    type: DirectiveType;
    title: string;
    description?: string;
    file: any;
    date: string;
    period: { from: string; to: string };
};
type NamedListRecord = { key: string; data: any };
type ReportTemplateRecord = { id: number; name: string; filePath: string; createdAt: string };

const api = {
    // ========= Authentication (session lives in the main process) =========
    auth: {
        getState: () => invoke<Result<AuthState>>(AUTH_CHANNELS.getState),
        setup: (input: SetupInput) =>
            invoke<Result<{ session: SessionInfo; recoveryCode: string }>>(
                AUTH_CHANNELS.setup,
                input,
            ),
        login: (username: string, password: string) =>
            invoke<Result<SessionInfo>>(AUTH_CHANNELS.login, username, password),
        logout: () => invoke<Result<void>>(AUTH_CHANNELS.logout),
        changePassword: (currentPassword: string, newPassword: string) =>
            invoke<Result<SessionInfo>>(AUTH_CHANNELS.changePassword, currentPassword, newPassword),
        recover: (username: string, recoveryCode: string, newPassword: string) =>
            invoke<Result<void>>(AUTH_CHANNELS.recover, username, recoveryCode, newPassword),
        regenerateRecoveryCode: (currentPassword: string) =>
            invoke<Result<string>>(AUTH_CHANNELS.regenerateRecoveryCode, currentPassword),
    },

    accounts: {
        list: () => invoke<Result<AccountDTO[]>>(ACCOUNT_CHANNELS.list),
        create: (input: CreateAccountInput) =>
            invoke<Result<AccountDTO>>(ACCOUNT_CHANNELS.create, input),
        update: (id: number, input: UpdateAccountInput) =>
            invoke<Result<AccountDTO>>(ACCOUNT_CHANNELS.update, id, input),
        resetPassword: (id: number, temporaryPassword: string) =>
            invoke<Result<void>>(ACCOUNT_CHANNELS.resetPassword, id, temporaryPassword),
        unlock: (id: number) => invoke<Result<void>>(ACCOUNT_CHANNELS.unlock, id),
        remove: (id: number) => invoke<Result<void>>(ACCOUNT_CHANNELS.remove, id),
    },

    roles: {
        list: () => invoke<Result<RoleDTO[]>>(ROLE_CHANNELS.list),
        create: (input: RoleInput) => invoke<Result<RoleDTO>>(ROLE_CHANNELS.create, input),
        update: (id: number, input: RoleInput) =>
            invoke<Result<RoleDTO>>(ROLE_CHANNELS.update, id, input),
        remove: (id: number) => invoke<Result<void>>(ROLE_CHANNELS.remove, id),
    },

    audit: {
        list: (query: AuditQuery) => invoke<Result<AuditPage>>('audit:list', query),
    },

    backup: {
        exportPackage: (password: string) =>
            invoke<Result<ExportResult>>(BACKUP_CHANNELS.exportPackage, password),
        selectImportFile: () => invoke<Result<ImportSelection>>(BACKUP_CHANNELS.selectImportFile),
        inspect: (password: string) =>
            invoke<Result<ImportInspection>>(BACKUP_CHANNELS.inspect, password),
        restore: () => invoke<Result<RestoreResult>>(BACKUP_CHANNELS.restore),
        getSettings: () => invoke<Result<BackupSettings>>(BACKUP_CHANNELS.getSettings),
        updateSettings: (patch: Partial<AutoBackupSettings>) =>
            invoke<Result<BackupSettings>>(BACKUP_CHANNELS.updateSettings, patch),
        listSnapshots: () => invoke<Result<SnapshotInfo[]>>(BACKUP_CHANNELS.listSnapshots),
        createSnapshot: () => invoke<Result<string>>(BACKUP_CHANNELS.createSnapshot),
        openBackupsFolder: () => invoke<Result<void>>(BACKUP_CHANNELS.openBackupsFolder),
        resetAll: () => invoke<Result<string>>(BACKUP_CHANNELS.resetAll),
    },

    events: {
        /** Session ended or permissions changed (logout elsewhere, restore, role edit). */
        onSessionChanged: (callback: () => void) => {
            const listener = () => callback();
            ipcRenderer.on(AUTH_EVENTS.sessionChanged, listener);
            return () => ipcRenderer.removeListener(AUTH_EVENTS.sessionChanged, listener);
        },
    },

    // ========= Change log exchange (offline, encrypted .pmc files) =========
    exportChangeLogs: (password: string) =>
        invoke<{ exported: number; canceled?: boolean; error?: string }>(
            'change-history:export',
            password,
        ),
    importChangeLogs: (password: string) =>
        invoke<{
            imported: number;
            skipped?: number;
            failed?: number;
            canceled?: boolean;
            error?: string;
        }>('change-history:import', password),

    // ========= Personnel =========
    fetchUsersMetadata: () => invoke<User[]>('fetch-users-metadata'),
    users: {
        getOne: (id: number) => invoke<User | null>('users:get-one', id),
    },
    addUser: (user: Omit<User, 'id'> | User) => invoke<User>('add-user', user),
    updateUser: (user: User) => invoke<User>('update-user', user),
    deleteUser: (id: number) => invoke<boolean>('delete-user', id),
    bulkUpdateUsers: (users: Partial<User>[]) =>
        invoke<{ success: boolean; error?: string }>('bulkUpdateUsers', users),
    getDbColumns: () => invoke<string[]>('users:get-db-columns'),

    // ========= History & comments =========
    getUserHistory: (userId: number, filter: string) =>
        invoke<CommentOrHistoryEntry[]>('history:get-user-history', userId, filter),
    getUserHistoryByRange: (userId: number, range: '1d' | '7d' | '30d' | 'all') =>
        invoke<CommentOrHistoryEntry[]>('history:getByUserAndRange', userId, range),
    addUserHistory: (userId: number, newEntry: CommentOrHistoryEntry) =>
        invoke<{ success: boolean; message?: string }>('history:add-entry', userId, newEntry),
    editUserHistory: (userId: number, updatedEntry: CommentOrHistoryEntry) =>
        invoke<{ success: boolean; message?: string }>('history:edit-entry', userId, updatedEntry),
    deleteUserHistory: (id: number) =>
        invoke<{ success: boolean; message?: string }>('deleteUserHistory', id),
    loadHistoryFile: (userId: number, entryId: number, filename: string) =>
        invoke<{ dataUrl: string }>('history:load-file', userId, entryId, filename),
    findIncompleteHistory: () =>
        invoke<
            {
                userId: number;
                entryId: number;
                reason: 'missing_file' | 'missing_period' | 'missing_both';
            }[]
        >('history:find-incomplete'),

    getUserComments: (userId: number) =>
        invoke<CommentOrHistoryEntry[]>('comments:get-user-comments', userId),
    addUserComment: (userId: number, newComment: CommentOrHistoryEntry) =>
        invoke<{ success: boolean; message?: string }>(
            'comments:add-user-comment',
            userId,
            newComment,
        ),
    deleteUserComment: (id: number) => invoke<boolean>('comments:delete-user-comment', id),

    // ========= Directives (orders / exclusions / restorations) =========
    directives: {
        add: (entry: DirectiveInput) => invoke<void>('directives:add', entry),
        getAllByType: (type: DirectiveType) =>
            invoke<DirectiveRecord[]>('directives:getAllByType', type),
        deleteById: (id: number) => invoke<void>('directives:deleteById', id),
        delete: (params: { userId: number; date: string }) =>
            invoke<void>('directives:delete', params),
        clearByType: (type: DirectiveType) => invoke<void>('directives:clearByType', type),
    },

    // ========= Staffing table (штатні посади) =========
    shtatni: {
        fetchAll: () => invoke<ShtatnaPosada[]>('fetch-shtatni-posady'),
        import: (positions: ShtatnaPosada[]) =>
            invoke<{ success: boolean; added: number; skipped: number; total: number }>(
                'import-shtatni-posady',
                positions,
            ),
        update: (position: ShtatnaPosada) =>
            invoke<{ success: boolean; message?: string }>('update-shtatni-posada', position),
        delete: (shtatNumber: string) =>
            invoke<{ success: boolean }>('delete-shtatni-posada', shtatNumber),
        deleteAll: () =>
            invoke<{ success: boolean; deleted?: number }>('delete-all-shtatni-posady'),
    },

    // ========= Reports & templates =========
    getAllReportTemplates: () => invoke<any[]>('get-all-report-templates'),
    convertDocxToPdf: (buffer: ArrayBuffer, fileName: string) =>
        invoke<string>('convert-docx-to-pdf', buffer, fileName),
    saveReportFileToDisk: (buffer: ArrayBuffer, name: string) =>
        invoke<string>('save-report-file-to-disk', buffer, name),
    addReportTemplateToDb: (name: string, filePath: string) =>
        invoke<{ success: boolean }>('add-report-template', name, filePath),
    deleteReportTemplateFromDb: (id: number) =>
        invoke<{ success: boolean }>('delete-report-template', id),
    getReportTemplatesFromDb: () =>
        invoke<ReportTemplateRecord[]>('get-all-report-templates-from-db'),
    readReportFileBuffer: (filePath: string) =>
        invoke<ArrayBuffer>('read-report-file-buffer', filePath),

    // ========= Named list (табель) =========
    namedList: {
        create: (key: string, data: any) =>
            invoke<{ success: boolean; message?: string }>('named-list:create', key, data),
        updateCell: (key: string, rowId: number, dayIndex: number, value: string) =>
            invoke<{ success: boolean; message?: string }>(
                'named-list:update-cell',
                key,
                rowId,
                dayIndex,
                value,
            ),
        getAll: () => invoke<NamedListRecord[]>('named-list:get-all'),
        delete: (key: string) => invoke<{ success: boolean }>('named-list:delete', key),
    },

    // ========= Reminders =========
    getTodos: () => invoke<{ id: number; content: string; completed: number }[]>('fetch-todos'),
    addTodo: (content: string) =>
        invoke<{ id: number; content: string; completed: number }>('add-todos', content),
    toggleTodo: (id: number) =>
        invoke<{ id: number; content: string; completed: number }>('toggle-todos', id),
    deleteTodo: (id: number) => invoke<boolean>('delete-todos', id),

    // ========= Application window =========
    getAppVersion: () => invoke<string>('get-app-version'),
    checkForUpdates: () =>
        invoke<{ status: 'ok'; info?: any } | { status: 'error'; message: string }>(
            'check-for-updates',
        ),
    closeApp: () => ipcRenderer.send('app:close'),
    hideApp: () => invoke<void>('hide-app'),
    toggleFullScreen: () => ipcRenderer.send('app:toggle-fullscreen'),
};

export type ElectronAPI = typeof api;

contextBridge.exposeInMainWorld('electronAPI', api);
