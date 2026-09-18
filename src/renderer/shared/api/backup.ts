import type { SessionInfo, SetupInput } from '../../../shared/auth/types';
import type {
    BackupSettings,
    BackupSettingsPatch,
    ExportResult,
    ImportInspection,
    ImportSelection,
    ResetOptions,
    ResetResult,
    RestoreRequest,
    RestoreResult,
    SnapshotInfo,
} from '../../../shared/backup/types';
import type { ChangeLogExportResult, ChangeLogImportResult } from '../../../shared/types/sync';
import { bridge, call } from './bridge';
import { unwrap } from './call';

/** Full encrypted backups, restore, automatic snapshots, reset. Throws ApiError. */
export const backupApi = {
    /** Asks where to save; CANCELED when the dialog is closed. */
    exportPackage: (password: string): Promise<ExportResult> =>
        unwrap(bridge().backup.exportPackage(password)),
    selectImportFile: (): Promise<ImportSelection> => unwrap(bridge().backup.selectImportFile()),
    inspect: (password: string): Promise<ImportInspection> =>
        unwrap(bridge().backup.inspect(password)),
    restore: (request?: RestoreRequest): Promise<RestoreResult> =>
        unwrap(bridge().backup.restore(request)),
    getSettings: (): Promise<BackupSettings> => unwrap(bridge().backup.getSettings()),
    updateSettings: (patch: BackupSettingsPatch): Promise<BackupSettings> =>
        unwrap(bridge().backup.updateSettings(patch)),
    listSnapshots: (): Promise<SnapshotInfo[]> => unwrap(bridge().backup.listSnapshots()),
    createSnapshot: (): Promise<string> => unwrap(bridge().backup.createSnapshot()),
    openBackupsFolder: (): Promise<void> => unwrap(bridge().backup.openBackupsFolder()),
    resetAll: (options: ResetOptions = {}): Promise<ResetResult> =>
        unwrap(bridge().backup.resetAll(options)),
    /**
     * Sign-in screen: the current data (with its key) moves into backups/set-aside and
     * `input` becomes the administrator of a new, empty data set, signed in.
     */
    startOver: (input: SetupInput): Promise<{ session: SessionInfo; recoveryCode: string }> =>
        unwrap(bridge().backup.startOver(input)),
    /** False in development runs and portable copies: there is nothing to uninstall. */
    canUninstall: (): Promise<boolean> => unwrap(bridge().backup.canUninstall()),
    /** Destroys all data and removes the program; the window closes. */
    uninstall: (): Promise<void> => unwrap(bridge().backup.uninstall()),
    /** Name of the .pmb file the program was opened with (double-click), or null. */
    openedFileName: (): Promise<string | null> => unwrap(bridge().backup.openedFile()),
    /** Selects that file for restore (once). */
    selectOpenedFile: (): Promise<ImportSelection> => unwrap(bridge().backup.selectOpenedFile()),
    onFileOpened: (callback: () => void): (() => void) => bridge().backup.onFileOpened(callback),
};

/**
 * Change-log exchange (.pmc). Expected outcomes (short or wrong password, unreadable file,
 * canceled dialog) come back in the result for the screen to explain; only unexpected
 * failures throw.
 */
export const changeLogApi = {
    export: (password: string): Promise<ChangeLogExportResult> =>
        call(bridge().exportChangeLogs(password)),
    import: (password: string): Promise<ChangeLogImportResult> =>
        call(bridge().importChangeLogs(password)),
};
