import { ipcRenderer } from 'electron';

import type { SessionInfo, SetupInput } from '../../shared/auth/types';
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
} from '../../shared/backup/types';
import { BACKUP_CHANNELS, BACKUP_EVENTS, SYNC_CHANNELS } from '../../shared/ipc/channels';
import type { Result } from '../../shared/ipc/result';
import type { ChangeLogExportResult, ChangeLogImportResult } from '../../shared/types/sync';
import { invoke } from '../invoke';

export const backupApi = {
    exportPackage: (password: string) =>
        invoke<Result<ExportResult>>(BACKUP_CHANNELS.exportPackage, password),
    selectImportFile: () => invoke<Result<ImportSelection>>(BACKUP_CHANNELS.selectImportFile),
    inspect: (password: string) =>
        invoke<Result<ImportInspection>>(BACKUP_CHANNELS.inspect, password),
    restore: (request?: RestoreRequest) =>
        invoke<Result<RestoreResult>>(BACKUP_CHANNELS.restore, request),
    getSettings: () => invoke<Result<BackupSettings>>(BACKUP_CHANNELS.getSettings),
    updateSettings: (patch: BackupSettingsPatch) =>
        invoke<Result<BackupSettings>>(BACKUP_CHANNELS.updateSettings, patch),
    listSnapshots: () => invoke<Result<SnapshotInfo[]>>(BACKUP_CHANNELS.listSnapshots),
    createSnapshot: () => invoke<Result<string>>(BACKUP_CHANNELS.createSnapshot),
    openBackupsFolder: () => invoke<Result<void>>(BACKUP_CHANNELS.openBackupsFolder),
    resetAll: (options: ResetOptions) =>
        invoke<Result<ResetResult>>(BACKUP_CHANNELS.resetAll, options),
    startOver: (input: SetupInput) =>
        invoke<Result<{ session: SessionInfo; recoveryCode: string }>>(
            BACKUP_CHANNELS.startOver,
            input,
        ),
    canUninstall: () => invoke<Result<boolean>>(BACKUP_CHANNELS.canUninstall),
    uninstall: () => invoke<Result<void>>(BACKUP_CHANNELS.uninstall),
    openedFile: () => invoke<Result<string | null>>(BACKUP_CHANNELS.openedFile),
    selectOpenedFile: () => invoke<Result<ImportSelection>>(BACKUP_CHANNELS.selectOpenedFile),
    onFileOpened: (callback: () => void) => {
        const listener = () => callback();
        ipcRenderer.on(BACKUP_EVENTS.fileOpened, listener);
        return () => ipcRenderer.removeListener(BACKUP_EVENTS.fileOpened, listener);
    },
};

/** Change-log exchange between computers (offline, encrypted .pmc files). */
export const changeLogApi = {
    exportChangeLogs: (password: string) =>
        invoke<ChangeLogExportResult>(SYNC_CHANNELS.exportChanges, password),
    importChangeLogs: (password: string) =>
        invoke<ChangeLogImportResult>(SYNC_CHANNELS.importChanges, password),
};
