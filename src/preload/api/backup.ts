import type {
    AutoBackupSettings,
    BackupSettings,
    ExportResult,
    ImportInspection,
    ImportSelection,
    RestoreResult,
    SnapshotInfo,
} from '../../shared/backup/types';
import { BACKUP_CHANNELS, SYNC_CHANNELS } from '../../shared/ipc/channels';
import type { Result } from '../../shared/ipc/result';
import type { ChangeLogExportResult, ChangeLogImportResult } from '../../shared/types/sync';
import { invoke } from '../invoke';

export const backupApi = {
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
};

/** Change-log exchange between computers (offline, encrypted .pmc files). */
export const changeLogApi = {
    exportChangeLogs: (password: string) =>
        invoke<ChangeLogExportResult>(SYNC_CHANNELS.exportChanges, password),
    importChangeLogs: (password: string) =>
        invoke<ChangeLogImportResult>(SYNC_CHANNELS.importChanges, password),
};
