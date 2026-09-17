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
        files: number;
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
};

export type RestoreResult = {
    format: BackupFormat;
    safetySnapshot: string;
    migratedFrom: number;
    migratedTo: number;
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
