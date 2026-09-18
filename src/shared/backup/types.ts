export type BackupFormat = 'pmb2' | 'legacy-encrypted' | 'legacy-sqlite';

export type BackupManifest = {
    formatVersion: 2;
    createdAt: string;
    appVersion: string;
    schemaVersion: number;
    sourceInstanceId: string;
    counts: {
        personnel: number;
        accounts: number;
        /** Every file of the package, blank templates included. */
        files: number;
        /** Attachments and saved documents (packages made since this field exists). */
        documents?: number;
    };
    totalBytes: number;
};

export type ExportResult = {
    fileName: string;
    sizeBytes: number;
    manifest: BackupManifest;
};

export type ImportSelection = {
    fileName: string;
    sizeBytes: number;
    format: BackupFormat;
    requiresPassword: boolean;
};

export type ImportInspection = {
    format: BackupFormat;
    /** Present for full packages; legacy files contain only the database. */
    manifest: BackupManifest | null;
    includesFiles: boolean;
    databaseSchemaVersion: number;
    willMigrate: boolean;
    personnelCount: number;
    accountCount: number;
    /** Login of the signed-in administrator, who keeps signing in after the restore. */
    keepsAccount?: string | null;
};

export type RestoreResult = {
    format: BackupFormat;
    safetySnapshot: string;
    migratedFrom: number;
    migratedTo: number;
};

export type ResetOptions = {
    /**
     * Also destroy every local copy (automatic and safety snapshots) instead of keeping the
     * current data in a safety snapshot. Nothing is left on this computer to recover from.
     */
    destroyLocalCopies?: boolean;
};

export type ResetResult = {
    /** Safety snapshot with the previous data, or null when everything was destroyed. */
    safetySnapshot: string | null;
    destroyedFiles: number;
};

export type AutoBackupSettings = {
    enabled: boolean;
    intervalDays: number;
    keep: number;
};

export type BackupSettings = {
    autoBackup: AutoBackupSettings;
    lastAutoBackupAt: string | null;
};

export type SnapshotKind = 'auto' | 'safety';

export type SnapshotInfo = {
    name: string;
    kind: SnapshotKind;
    createdAt: string;
    sizeBytes: number;
};

export const BACKUP_PASSWORD_MIN_LENGTH = 8;
