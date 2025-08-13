// src/types/global.d.ts
import './index';

import { ShtatnaPosada } from '../shared/types/shtatnaPosada';
import type { CommentOrHistoryEntry, User } from '../shared/types/user';

export {};

declare global {
    // App tab keys used in permissions
    // type any =
    //     | 'manager'
    //     | 'backups'
    //     | 'reports'
    //     | 'tables'
    //     | 'importUsers'
    //     | 'shtatni'
    //     | 'instructions'
    //     | 'admin';

    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Window {
        electronAPI: {
            // ========= Comments  =========
            getUserComments: (userId: number) => Promise<CommentOrHistoryEntry[]>;
            addUserComment: (
                userId: number,
                newComment: CommentOrHistoryEntry,
            ) => Promise<{ success: boolean; message?: string }>;
            deleteUserComment: (id: number) => Promise<boolean>;

            // ========= Files / Misc =========
            loadHistoryFile: (
                userId: number,
                entryId: number,
                filename: string,
            ) => Promise<{ dataUrl: string }>;
            fetchUsersMetadata: () => Promise<any>;

            // ========= Database & Backup =========
            downloadDbSafe: (password: string) => Promise<boolean>;
            restoreDbSafe: (password: string) => Promise<boolean>;
            downloadDb: () => Promise<boolean>;
            replaceDb: () => Promise<boolean>;
            restoreDb: () => Promise<boolean>;
            resetDb: () => Promise<boolean>;
            setBackupIntervalInDays: (days: number) => Promise<void>;
            getBackupIntervalInDays: () => Promise<number>;
            getUserDataPath: () => Promise<string>;
            getBackupPath: () => Promise<string>;

            // ========= Directives =========
            directives: {
                add: (entry: {
                    userId: number;
                    type: 'order' | 'exclude' | 'restore';
                    title: string;
                    description?: string;
                    file: any;
                    date: string;
                    period?: { from: string; to?: string };
                }) => Promise<void>;
                getAllByType: (type: 'order' | 'exclude' | 'restore') => Promise<
                    {
                        id: number;
                        userId: number;
                        type: 'order' | 'exclude' | 'restore';
                        title: string;
                        description?: string;
                        file: any;
                        date: string;
                        period: { from: string; to: string };
                    }[]
                >;
                deleteById: (id: number) => Promise<void>;
                delete: (params: { userId: number; date: string }) => Promise<void>;
                clearByType: (type: 'order' | 'exclude' | 'restore') => Promise<void>;
            };

            // ========= Users =========
            fetchUsers: () => Promise<User[]>; // legacy: всі користувачі
            users: {
                fetchPaginated: (args?: {
                    page?: number;
                    limit?: number;
                    fields?: string[];
                }) => Promise<{ data: any[]; page: number; limit: number; total: number }>;
                getOne: (id: number) => Promise<any>;
            };
            addUser: (user: any) => Promise<User>;
            updateUser: (user: User) => Promise<User>;
            deleteUser: (id: number) => Promise<boolean>;
            bulkUpdateUsers: (users: any[]) => Promise<{ success: boolean; error?: string }>;
            getDbColums: () => Promise<string[]>; // сумісність
            getDbColumns: () => Promise<string[]>;

            // ========= History =========
            getUserHistory: (userId: number, filter: string) => Promise<CommentOrHistoryEntry[]>;
            addUserHistory: (userId: number, newEntry: any) => Promise<CommentOrHistoryEntry[]>;
            deleteUserHistory: (id: number) => Promise<boolean>;
            editUserHistory: (
                userId: number,
                updatedEntry: CommentOrHistoryEntry,
            ) => Promise<CommentOrHistoryEntry[]>;
            getUserHistoryByRange: (
                userId: number,
                range: '1d' | '7d' | '30d' | 'all',
            ) => Promise<CommentOrHistoryEntry[]>;

            // ========= Auth (sessions) =========
            hasUser: () => Promise<boolean>;
            register: (username: string, password: string, hint: string) => Promise<boolean>;
            login: (username: string, password: string) => Promise<boolean>;
            getRecoveryHint: (username: string) => Promise<string | null>;
            resetPassword: (
                username: string,
                hint: string,
                newPassword: string,
            ) => Promise<boolean>;
            superuserLogin: (username: string, password: string) => Promise<string | false>;
            defaultAdminLogin: (username: string, password: string) => Promise<string | false>;
            loginAny: (
                u: string,
                p: string,
            ) => Promise<{
                ok: boolean;
                role?: 'default_admin' | 'admin' | 'user';
                key?: string | null;
                app_key?: string | null;
                user?: { id: number; username: string };
                // NEW: per-tab permissions from the server
                permissions?: { allowed_tabs: any[] };
            }>;

            // ========= Auth Management =========
            getAuthUsers: () => Promise<
                {
                    id: number;
                    username: string;
                    recovery_hint: string | null;
                    role: 'user' | 'admin'; // kept for backward compatibility
                    key: string;
                    // NEW: richer role info
                    role_id?: number | null;
                    role_name?: string | null;
                }[]
            >;
            updateAuthUser: (
                userId: number,
                updates: Partial<{
                    username: string;
                    password: string;
                    recovery_hint: string;
                    role: 'user' | 'admin';
                }>,
            ) => Promise<boolean>;
            deleteAuthUser: (id: number) => Promise<boolean>;
            generateKeyForUser: (id: number) => Promise<{ success: boolean; key?: string }>;
            getDefaultAdmin: () => Promise<{
                id: number;
                username: string;
                recovery_hint: string | null;
                key: string;
                app_key?: string;
            } | null>;
            updateDefaultAdmin: (
                updates: Partial<{ username: string; password: string; recovery_hint: string }>,
            ) => Promise<boolean>;

            // ========= Roles & permissions (NEW) =========
            roles: {
                list: () => Promise<
                    { id: number; name: string; description: string; allowed_tabs: any[] }[]
                >;
                create: (payload: {
                    name: string;
                    description?: string;
                    allowed_tabs: any[];
                }) => Promise<{
                    success: boolean;
                    role?: {
                        id: number;
                        name: string;
                        description: string;
                        allowed_tabs: any[];
                    };
                    message?: string;
                }>;
                update: (
                    id: number,
                    updates: Partial<{ name: string; description: string; allowed_tabs: any[] }>,
                ) => Promise<{
                    success: boolean;
                    role?: {
                        id: number;
                        name: string;
                        description: string;
                        allowed_tabs: any[];
                    };
                    message?: string;
                }>;
                delete: (id: number) => Promise<{ success: boolean; message?: string }>;
            };
            setUserRole: (
                userId: number,
                roleId: number,
            ) => Promise<{ success: boolean; message?: string }>;

            // ========= App Keys / Version =========
            appKey: () => Promise<string>;
            checkForUpdates: () => Promise<
                { status: 'ok'; info?: any } | { status: 'error'; message: string }
            >;
            getAppVersion: () => Promise<string>;

            // ========= App Window =========
            closeApp: () => Promise<void>;
            hideApp: () => Promise<void>;
            toggleFullScreen: () => Promise<void>;
            onClearToken: (callback: () => void) => Promise<void>;

            // ========= Todos =========
            getTodos: () => Promise<{ id: number; content: string; completed: number }[]>;
            addTodo: (content: string) => Promise<void>;
            toggleTodo: (id: number) => Promise<void>;
            deleteTodo: (id: number) => Promise<void>;

            // ========= Reports / Templates =========
            getAllReportTemplates: () => Promise<any>;
            convertDocxToPdf: (buffer: ArrayBuffer, fileName: string) => Promise<any>;
            shtatni: {
                fetchAll: () => Promise<ShtatnaPosada[]>;
                import: (
                    positions: ShtatnaPosada[],
                ) => Promise<{ added: number; skipped: number; total: number }>;
                update: (pos: ShtatnaPosada) => Promise<{ success: boolean; message?: string }>;
                delete: (shtat_number: string) => Promise<{ success: boolean }>;
                deleteAll: () => Promise<{ success: boolean }>;
            };
            saveReportFileToDisk: (buffer: ArrayBuffer, name: string) => Promise<string>;
            addReportTemplateToDb: (
                name: string,
                filePath: string,
            ) => Promise<{ success: boolean }>;
            deleteReportTemplateFromDb: (id: number) => Promise<{ success: boolean }>;
            getReportTemplatesFromDb: () => Promise<
                { id: number; name: string; filePath: string; createdAt: string }[]
            >;
            readReportFileBuffer: (filePath: string) => Promise<ArrayBuffer>;

            // ========= Morphology =========
            morphy: { analyzeWords: (words: string[]) => Promise<any> };

            // ========= Change History =========
            exportChangeLogs: (password: string) => Promise<void>;
            importChangeLogs: (password: string) => Promise<{ imported: number; error?: string }>;
            changeHistory: {
                log: (change: {
                    table: string;
                    recordId: number;
                    operation: string;
                    data?: any;
                    sourceId?: string;
                }) => Promise<void>;
            };
        };
    }
}
