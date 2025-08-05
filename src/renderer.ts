import './index';
import { ShtatnaPosada } from './types/shtatnaPosada';
import type { CommentOrHistoryEntry, User } from './types/user';

export {};

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Window {
        electronAPI: {
            // ... inside electronAPI
            namedList: {
                create: (key: string, data: any) => Promise<void>;
                updateCell: (
                    key: string,
                    rowId: number,
                    dayIndex: number,
                    value: string,
                ) => Promise<void>;
                getAll: () => Promise<Record<string, any[]>>;
                delete: (key: string) => Promise<void>;
            };
            users: {
                getOne: (id: number) => Promise<any>;
            };
            loadHistoryFile: (
                userId: number,
                entryId: number,
                filename: string,
            ) => Promise<{ dataUrl: string }>;
            fetchUsersMetadata: () => Promise<any>;
            //close
            closeApp: () => Promise<any>;
            // --- Auth ---
            hasUser: () => Promise<boolean>;
            register: (username: string, password: string, hint: string) => Promise<void>;
            login: (username: string, password: string) => Promise<boolean>;
            getRecoveryHint: (username: string) => Promise<string | null>;
            resetPassword: (
                username: string,
                hint: string,
                newPassword: string,
            ) => Promise<boolean>;
            getUserDataPath: () => Promise<string>;
            getBackupPath: () => Promise<string>;
            superuserLogin: (username: string, password: string) => Promise<string | false>;
            defaultAdminLogin: (username: string, password: string) => Promise<string | false>;
            getAuthUsers: () => Promise<
                {
                    id: number;
                    username: string;
                    recovery_hint: string;
                    role?: string;
                    key?: string;
                }[]
            >;
            updateAuthUser: (
                userId: number,
                updates: Partial<{
                    username: string;
                    password: string;
                    recovery_hint: string;
                    role: string;
                }>,
            ) => Promise<boolean>;

            getDefaultAdmin: () => Promise<{
                id: number;
                username: string;
                password: string;
                recovery_hint: string | null;
                key: string;
                app_key?: string;
            } | null>;

            updateDefaultAdmin: (
                updates: Partial<{
                    username: string;
                    password: string;
                    recovery_hint: string;
                }>,
            ) => Promise<boolean>;

            // --- DB Management ---
            downloadDbSafe: (password: any) => Promise<boolean>;
            restoreDbSafe: (password: any) => Promise<boolean>;
            downloadDb: () => Promise<boolean>;
            replaceDb: () => Promise<boolean>;
            restoreDb: () => Promise<boolean>;
            resetDb: () => Promise<boolean>;
            setBackupIntervalInDays: (days: number) => Promise<void>;
            getBackupIntervalInDays: () => Promise<number>;

            // --- User CRUD ---
            fetchUsers: () => Promise<User[]>;
            addUser: (user: any) => Promise<User>;
            updateUser: (user: User) => Promise<User>;
            deleteUser: (id: number) => Promise<boolean>;
            bulkUpdateUsers: (user: any) => Promise<any>;

            getDbColums: () => Promise<string[]>;

            //  --- History CRUD ---
            getUserHistory: (userId: number, filter: string) => Promise<CommentOrHistoryEntry[]>;
            addUserHistory: (userId: number, newEntry: any) => Promise<CommentOrHistoryEntry[]>;
            deleteUserHistory: (id: number) => Promise<boolean>;
            editUserHistory: (
                userId: number,
                updatedEntry: CommentOrHistoryEntry,
            ) => Promise<CommentOrHistoryEntry[]>;

            // --- Comments CRUD ---
            getUserComments: (userId: number) => Promise<CommentOrHistoryEntry[]>;
            addUserComment: (userId: number, newComment: any) => Promise<{ success: boolean }>;
            deleteUserComment: (id: number) => Promise<boolean>;

            // ---Updater----
            checkForUpdates: () => Promise<
                { status: 'ok'; info?: any } | { status: 'error'; message: string }
            >;
            getAppVersion: () => Promise<string>;

            // clear toke
            onClearToken: (callback: () => void) => Promise<any>;

            // --- Todos ---
            getTodos: () => Promise<{ id: number; content: string; completed: number }[]>;
            addTodo: (content: string) => Promise<void>;
            toggleTodo: (id: number) => Promise<void>;
            deleteTodo: (id: number) => Promise<void>;

            //templates
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
            getUserHistoryByRange: (
                userId: number,
                range: '1d' | '7d' | '30d' | 'all',
            ) => Promise<CommentOrHistoryEntry[]>;

            // SQLite-backed template storage
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
            morphy: {
                analyzeWords: (words: string[]) => Promise<any>;
            };
            hideApp: () => Promise<void>;
            toggleFullScreen: () => Promise<void>;
            // directives
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
            // LOGS
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
