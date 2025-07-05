import './index';
import type { CommentOrHistoryEntry, User } from './types/user';

export {};

declare global {
    interface Window {
        electronAPI: {
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

            // --- DB Management ---
            downloadDb: () => Promise<boolean>;
            replaceDb: () => Promise<boolean>;
            restoreDb: () => Promise<boolean>;
            resetDb: () => Promise<boolean>;
            setBackupIntervalInDays: (days: number) => Promise<void>;
            getBackupIntervalInDays: () => Promise<number>;

            // --- User CRUD ---
            fetchUsers: () => Promise<User[]>;
            addUser: (user: Omit<User, 'id'>) => Promise<User>;
            updateUser: (user: User) => Promise<User>;
            deleteUser: (id: number) => Promise<boolean>;

            //  --- History CRUD ---
            getUserHistory: (userId: number, filter: string) => Promise<CommentOrHistoryEntry[]>;
            addUserHistory: (userId: number, newEntry: any) => Promise<CommentOrHistoryEntry[]>;
            deleteUserHistory: (id: number) => Promise<boolean>;

            // --- Comments CRUD ---
            getUserComments: (userId: number) => Promise<CommentOrHistoryEntry[]>;
            addUserComment: (userId: number, newComment: any) => Promise<{ success: boolean }>;
            deleteUserComment: (id: number) => Promise<boolean>;

            // ---Updater----
            checkForUpdates: () => Promise<
                { status: 'ok'; info?: any } | { status: 'error'; message: string }
            >;
            installUpdate: () => Promise<boolean>;
            getAppVersion: () => Promise<string>;

            // clear toke
            onClearToken: (callback: () => void) => Promise<any>;
            
            // --- Todos ---
            getTodos: () => Promise<{ id: number; content: string; completed: number }[]>;
            addTodo: (content: string) => Promise<void>;
            toggleTodo: (id: number) => Promise<void>;
            deleteTodo: (id: number) => Promise<void>;
        };
    }
}
