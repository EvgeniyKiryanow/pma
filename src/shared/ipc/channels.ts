/**
 * IPC channel names shared by main and preload — the single source of truth for both sides.
 * Older features keep their historical channel strings; new channels use the `feature:action`
 * form. Code never spells a channel name inline — it references these constants.
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
    /** Whether this installation can remove itself (installed on Windows). */
    canUninstall: 'system:can-uninstall',
    /** Destroys every piece of data, then removes the program from the computer. */
    uninstall: 'system:uninstall',
    /** Name of the .pmb file the program was opened with (double-click), or null. */
    openedFile: 'backup:opened-file',
    /** Selects that file for restore, as if chosen in the dialog. */
    selectOpenedFile: 'backup:select-opened-file',
} as const;

/** Pushes from the main process about backups. */
export const BACKUP_EVENTS = {
    /** The program was given a .pmb file while running (a second double-click). */
    fileOpened: 'backup:file-opened',
} as const;

export const APP_CHANNELS = {
    hide: 'hide-app',
    getVersion: 'get-app-version',
    /** Maximized (or full screen): the title bar shows the "smaller window" button. */
    isMaximized: 'app:is-maximized',
    checkForUpdates: 'check-for-updates',
    installUpdate: 'app:install-update',
    /** «Про програму»: version, build, system, data folder, developer. */
    about: 'app:about',
    /** Saves the program log where the person chooses, to send to the developer. */
    saveLog: 'app:save-log',
} as const;

/** One-way messages from the renderer (`ipcRenderer.send`, no reply). */
export const APP_EVENTS = {
    close: 'app:close',
    /** Title-bar button: maximized window ⇄ a smaller one. */
    toggleMaximize: 'app:toggle-maximize',
} as const;

export const PERSONNEL_CHANNELS = {
    list: 'fetch-users-metadata',
    getOne: 'users:get-one',
    create: 'add-user',
    update: 'update-user',
    remove: 'delete-user',
    bulkUpdateAssignments: 'bulkUpdateUsers',
    listColumns: 'users:get-db-columns',
} as const;

export const HISTORY_CHANNELS = {
    list: 'history:get-user-history',
    listByRange: 'history:getByUserAndRange',
    add: 'history:add-entry',
    edit: 'history:edit-entry',
    remove: 'deleteUserHistory',
    loadFile: 'history:load-file',
    findIncomplete: 'history:find-incomplete',
} as const;

export const COMMENT_CHANNELS = {
    list: 'comments:get-user-comments',
    add: 'comments:add-user-comment',
    remove: 'comments:delete-user-comment',
} as const;

export const DIRECTIVE_CHANNELS = {
    add: 'directives:add',
    listByType: 'directives:getAllByType',
    removeById: 'directives:deleteById',
    removeByUserAndDate: 'directives:delete',
    clearByType: 'directives:clearByType',
} as const;

export const STAFFING_CHANNELS = {
    list: 'fetch-shtatni-posady',
    import: 'import-shtatni-posady',
    update: 'update-shtatni-posada',
    remove: 'delete-shtatni-posada',
    removeAll: 'delete-all-shtatni-posady',
} as const;

export const REPORT_CHANNELS = {
    listBundledTemplates: 'get-all-report-templates',
    convertDocxToPdf: 'convert-docx-to-pdf',
    saveFile: 'save-report-file-to-disk',
    readFile: 'read-report-file-buffer',
    listTemplates: 'get-all-report-templates-from-db',
    addTemplate: 'add-report-template',
    removeTemplate: 'delete-report-template',
} as const;

export const NAMED_LIST_CHANNELS = {
    list: 'named-list:get-all',
    create: 'named-list:create',
    updateCell: 'named-list:update-cell',
    remove: 'named-list:delete',
} as const;

export const REMINDER_CHANNELS = {
    list: 'fetch-todos',
    add: 'add-todos',
    toggle: 'toggle-todos',
    remove: 'delete-todos',
} as const;

export const SYNC_CHANNELS = {
    exportChanges: 'change-history:export',
    importChanges: 'change-history:import',
} as const;

/** Application settings kept in the database (they travel with backups). */
export const SETTINGS_CHANNELS = {
    getSecurity: 'settings:get-security',
    updateSecurity: 'settings:update-security',
    getUnitInfo: 'settings:get-unit-info',
    updateUnitInfo: 'settings:update-unit-info',
} as const;

/**
 * Files in and out of the app. Every file dialog runs in the main process with
 * "do not add to recent", so Windows keeps no list of what was opened or saved.
 */
export const FILE_CHANNELS = {
    pick: 'files:pick',
    save: 'files:save',
    copyText: 'files:copy-text',
} as const;
