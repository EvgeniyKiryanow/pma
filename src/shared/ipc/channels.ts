/**
 * IPC channel names shared by main and preload. Legacy channels (users, history, reports...)
 * are still declared inline in their handlers and will move here as those modules are refactored.
 */

export const AUTH_CHANNELS = {
    getState: 'auth:get-state',
    setup: 'auth:setup',
    login: 'auth:login',
    logout: 'auth:logout',
    changePassword: 'auth:change-password',
    recover: 'auth:recover',
    regenerateRecoveryCode: 'auth:regenerate-recovery-code',
} as const;

export const AUTH_EVENTS = {
    /** Sent to a window when its session was ended or its permissions changed. */
    sessionChanged: 'auth:session-changed',
} as const;

export const ACCOUNT_CHANNELS = {
    list: 'accounts:list',
    create: 'accounts:create',
    update: 'accounts:update',
    resetPassword: 'accounts:reset-password',
    unlock: 'accounts:unlock',
    remove: 'accounts:delete',
} as const;

export const ROLE_CHANNELS = {
    list: 'roles:list',
    create: 'roles:create',
    update: 'roles:update',
    remove: 'roles:delete',
} as const;

export const BACKUP_CHANNELS = {
    exportPackage: 'backup:export',
    selectImportFile: 'backup:select-import-file',
    inspect: 'backup:inspect',
    restore: 'backup:restore',
    getSettings: 'backup:get-settings',
    updateSettings: 'backup:update-settings',
    listSnapshots: 'backup:list-snapshots',
    createSnapshot: 'backup:create-snapshot',
    openBackupsFolder: 'backup:open-folder',
    resetAll: 'system:reset-all',
} as const;
