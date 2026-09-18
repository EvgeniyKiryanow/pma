import { randomUUID } from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

import {
    BACKUP_PASSWORD_MIN_LENGTH,
    type BackupFormat,
    type BackupManifest,
    type ExportResult,
    type ImportInspection,
    type ImportSelection,
    type RestoreResult,
    type SnapshotInfo,
    type SnapshotKind,
} from '../../shared/backup/types';
import { AppError } from '../../shared/ipc/result';
import type { SessionManager } from '../auth/SessionManager';
import { directorySize, move, remove, timestampForFileName } from '../core/fsUtils';
import type { Logger } from '../core/logger';
import { AppPaths, DATA_DIRECTORIES, resolveInside } from '../core/paths';
import type { DatabaseManager } from '../db/connection';
import type { MigrationRunner } from '../db/migrations/runner';
import type { TemplateInstaller } from '../reports/TemplateInstaller';
import { ArchiveWriter, extractEntry, readArchiveIndex, readEntry } from './archive';
import { decryptLegacyBackup, decryptPackage, detectFormat, encryptFile } from './crypto';

const DB_FILE = 'users.db';
const DB_SIDE_FILES = ['', '-wal', '-shm'];
const SAFETY_SNAPSHOTS_TO_KEEP = 10;

type PendingImport = {
    filePath: string;
    selection: ImportSelection;
    workDir?: string;
    inspection?: ImportInspection;
};

export type BackupServiceDeps = {
    database: DatabaseManager;
    migrations: MigrationRunner;
    sessions: SessionManager;
    templates: TemplateInstaller;
    logger: Logger;
    appVersion: () => string;
    instanceId: () => string;
};

/**
 * Full backups (encrypted packages with database + attachments), restore of old formats,
 * local snapshots and full reset. Every destructive operation first moves the current data
 * into a safety snapshot, and rolls back to it if anything fails.
 */
export class BackupService {
    private readonly pending = new Map<number, PendingImport>();

    constructor(private readonly deps: BackupServiceDeps) {}

    // ------------------------------------------------------------------ export

    async exportPackage(targetPath: string, password: string): Promise<ExportResult> {
        this.assertPassword(password);
        const workDir = await this.createWorkDir('export');
        try {
            const dbCopy = path.join(workDir, DB_FILE);
            await this.deps.database.snapshotTo(dbCopy);

            let files = 0;
            let totalBytes = (await fsp.stat(dbCopy)).size;
            for (const dir of DATA_DIRECTORIES) {
                const size = await directorySize(dir.resolve());
                files += size.files;
                totalBytes += size.bytes;
            }

            const counts = await this.countRecords(dbCopy);
            const manifest: BackupManifest = {
                formatVersion: 2,
                createdAt: new Date().toISOString(),
                appVersion: this.deps.appVersion(),
                schemaVersion: this.deps.migrations.latestVersion,
                sourceInstanceId: this.deps.instanceId(),
                counts: { ...counts, files },
                totalBytes,
            };

            const archivePath = path.join(workDir, 'archive.bin');
            const writer = new ArchiveWriter(archivePath);
            await writer.open();
            await writer.addBuffer('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));
            await writer.addFile(`database/${DB_FILE}`, dbCopy);
            for (const dir of DATA_DIRECTORIES) {
                await writer.addDirectory(`files/${dir.name}`, dir.resolve());
            }
            await writer.close();

            // Write next to the target and rename, so a failed export never leaves a broken file.
            const partial = `${targetPath}.partial`;
            await encryptFile(archivePath, partial, password);
            await move(partial, targetPath).catch(async (err) => {
                await remove(partial);
                throw err;
            });

            // A backup nobody can restore is worthless: read it back before reporting success.
            await this.verifyPackage(targetPath, password, workDir);

            const { size } = await fsp.stat(targetPath);
            this.deps.logger.info(
                `Backup exported and verified: ${counts.personnel} personnel, ${files} files, ${size} bytes`,
            );
            return { fileName: path.basename(targetPath), sizeBytes: size, manifest };
        } finally {
            await remove(workDir);
        }
    }

    // ------------------------------------------------------------------ import

    async selectImport(senderId: number, filePath: string): Promise<ImportSelection> {
        await this.cancelImport(senderId);
        const format = await detectFormat(filePath);
        const { size } = await fsp.stat(filePath);
        const selection: ImportSelection = {
            fileName: path.basename(filePath),
            sizeBytes: size,
            format,
            requiresPassword: format !== 'legacy-sqlite',
        };
        this.pending.set(senderId, { filePath, selection });
        return selection;
    }

    /** Decrypts and validates the selected file into a staging area without touching live data. */
    async inspectImport(senderId: number, password: string): Promise<ImportInspection> {
        const pending = this.pending.get(senderId);
        if (!pending) throw new AppError('NOTHING_SELECTED');
        if (pending.workDir) await remove(pending.workDir);

        const workDir = await this.createWorkDir('import');
        pending.workDir = workDir;
        pending.inspection = undefined;
        const stagingDir = path.join(workDir, 'data');
        await fsp.mkdir(stagingDir, { recursive: true });
        const stagedDb = path.join(stagingDir, DB_FILE);
        const format = pending.selection.format;

        let manifest: BackupManifest | null = null;
        if (format === 'pmb2') {
            const archivePath = path.join(workDir, 'archive.bin');
            await decryptPackage(pending.filePath, archivePath, password);
            manifest = await this.extractPackage(archivePath, stagingDir);
            await remove(archivePath);
        } else if (format === 'legacy-encrypted') {
            await decryptLegacyBackup(pending.filePath, stagedDb, password);
        } else {
            await fsp.copyFile(pending.filePath, stagedDb);
        }

        const dbInfo = await this.validateDatabase(stagedDb);
        pending.inspection = {
            format,
            manifest,
            includesFiles: format === 'pmb2',
            databaseSchemaVersion: dbInfo.schemaVersion,
            willMigrate: dbInfo.schemaVersion < this.deps.migrations.latestVersion,
            personnelCount: dbInfo.personnel,
            accountCount: dbInfo.accounts,
        };
        return pending.inspection;
    }

    async restoreImport(senderId: number): Promise<RestoreResult> {
        const pending = this.pending.get(senderId);
        if (!pending?.inspection || !pending.workDir) throw new AppError('NOTHING_SELECTED');

        try {
            const { snapshot, from, to } = await this.replaceLiveData({
                reason: 'pre-restore',
                stagingDir: path.join(pending.workDir, 'data'),
                includeFiles: pending.inspection.includesFiles,
            });
            this.deps.logger.warn(
                `Data restored from ${pending.selection.format} backup (schema v${from} -> v${to})`,
            );
            return {
                format: pending.selection.format,
                safetySnapshot: snapshot,
                migratedFrom: from,
                migratedTo: to,
            };
        } finally {
            await this.cancelImport(senderId);
            this.deps.sessions.clearAll();
        }
    }

    async cancelImport(senderId: number): Promise<void> {
        const pending = this.pending.get(senderId);
        this.pending.delete(senderId);
        if (pending?.workDir) await remove(pending.workDir);
    }

    // ------------------------------------------------------------------ reset

    /** Moves all current data into a safety snapshot and starts with an empty database. */
    async resetAll(): Promise<string> {
        const stagingDir = await this.createWorkDir('reset');
        try {
            const { snapshot } = await this.replaceLiveData({
                reason: 'pre-reset',
                stagingDir,
                includeFiles: true,
            });
            this.deps.logger.warn('All data reset; previous data kept in a safety snapshot');
            return snapshot;
        } finally {
            await remove(stagingDir);
            this.deps.sessions.clearAll();
        }
    }

    // ------------------------------------------------------------------ snapshots

    async createAutoSnapshot(keep: number): Promise<string> {
        await fsp.mkdir(AppPaths.autoBackups, { recursive: true });
        const file = path.join(AppPaths.autoBackups, `auto-${timestampForFileName()}.sqlite`);
        await this.deps.database.snapshotTo(file);
        await this.prune('auto', keep);
        this.deps.logger.info('Automatic snapshot created');
        return path.basename(file);
    }

    /** Copy of the database only, used right before migrations run on an existing install. */
    async createSafetyDatabaseSnapshot(reason: string): Promise<string> {
        const dir = path.join(AppPaths.safetyBackups, `${timestampForFileName()}__${reason}`);
        await fsp.mkdir(dir, { recursive: true });
        await this.deps.database.snapshotTo(path.join(dir, DB_FILE));
        await this.prune('safety', SAFETY_SNAPSHOTS_TO_KEEP);
        return path.basename(dir);
    }

    async listSnapshots(): Promise<SnapshotInfo[]> {
        const result: SnapshotInfo[] = [];
        for (const kind of ['auto', 'safety'] as SnapshotKind[]) {
            const root = kind === 'auto' ? AppPaths.autoBackups : AppPaths.safetyBackups;
            if (!fs.existsSync(root)) continue;
            for (const item of await fsp.readdir(root, { withFileTypes: true })) {
                const full = path.join(root, item.name);
                const stat = await fsp.stat(full);
                const sizeBytes = item.isDirectory()
                    ? (await directorySize(full)).bytes
                    : stat.size;
                result.push({
                    name: item.name,
                    kind,
                    createdAt: stat.mtime.toISOString(),
                    sizeBytes,
                });
            }
        }
        return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    // ------------------------------------------------------------------ internals

    private assertPassword(password: string): void {
        if (typeof password !== 'string' || password.length < BACKUP_PASSWORD_MIN_LENGTH) {
            throw new AppError(
                'VALIDATION',
                `Пароль має містити щонайменше ${BACKUP_PASSWORD_MIN_LENGTH} символів`,
                {
                    field: 'password',
                },
            );
        }
    }

    /**
     * Decrypts the freshly written package and checks that the database inside opens.
     * Catches a broken flash drive or a half-written file while the user is still watching.
     */
    private async verifyPackage(
        filePath: string,
        password: string,
        workDir: string,
    ): Promise<void> {
        const checkDir = path.join(workDir, 'verify');
        await fsp.mkdir(checkDir, { recursive: true });
        const archivePath = path.join(checkDir, 'archive.bin');
        try {
            await decryptPackage(filePath, archivePath, password);
            const stagingDir = path.join(checkDir, 'data');
            await fsp.mkdir(stagingDir, { recursive: true });
            await this.extractPackage(archivePath, stagingDir);
            await this.validateDatabase(path.join(stagingDir, DB_FILE));
        } catch (err) {
            await remove(filePath);
            this.deps.logger.error(
                'Verification of the new backup failed; the file was removed',
                err,
            );
            throw new AppError(
                'CORRUPTED',
                'Копію створено, але перевірка не пройшла, тому файл видалено. Спробуйте зберегти на інший носій.',
            );
        } finally {
            await remove(checkDir);
        }
    }

    private async createWorkDir(kind: string): Promise<string> {
        // Inside userData: same volume as live data, so the final swap is a cheap rename.
        const dir = path.join(AppPaths.staging, `${kind}-${randomUUID()}`);
        await fsp.mkdir(dir, { recursive: true });
        return dir;
    }

    private async extractPackage(archivePath: string, stagingDir: string): Promise<BackupManifest> {
        const entries = await readArchiveIndex(archivePath);
        const manifestEntry = entries.find((e) => e.path === 'manifest.json');
        const dbEntry = entries.find((e) => e.path === `database/${DB_FILE}`);
        if (!manifestEntry || !dbEntry) throw new AppError('CORRUPTED', 'Package is incomplete');

        let manifest: BackupManifest;
        try {
            manifest = JSON.parse((await readEntry(archivePath, manifestEntry)).toString('utf8'));
        } catch {
            throw new AppError('CORRUPTED', 'Manifest is unreadable');
        }
        if (manifest?.formatVersion !== 2) throw new AppError('UNSUPPORTED_FORMAT');
        if (manifest.schemaVersion > this.deps.migrations.latestVersion) {
            throw new AppError('SCHEMA_TOO_NEW', undefined, {
                backupVersion: manifest.appVersion,
                schemaVersion: manifest.schemaVersion,
            });
        }

        await extractEntry(archivePath, dbEntry, path.join(stagingDir, DB_FILE));
        const knownDirs = new Set<string>(DATA_DIRECTORIES.map((d) => d.name));
        for (const entry of entries) {
            const [root, dirName, ...rest] = entry.path.split('/');
            if (root !== 'files' || !knownDirs.has(dirName) || !rest.length) continue;
            await extractEntry(archivePath, entry, resolveInside(stagingDir, dirName, ...rest));
        }
        return manifest;
    }

    private async validateDatabase(
        file: string,
    ): Promise<{ schemaVersion: number; personnel: number; accounts: number }> {
        let db;
        try {
            db = await open({
                filename: file,
                driver: sqlite3.Database,
                mode: sqlite3.OPEN_READONLY,
            });
            const check = await db.get<{ quick_check: string }>('PRAGMA quick_check');
            if (check?.quick_check !== 'ok') throw new Error('quick_check failed');
            const version =
                (await db.get<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
            const hasUsers = await db.get(
                `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'`,
            );
            if (!hasUsers) throw new Error('users table is missing');
            if (version > this.deps.migrations.latestVersion) {
                throw new AppError('SCHEMA_TOO_NEW', undefined, { schemaVersion: version });
            }
            const counts = await this.countRecordsIn(db);
            return { schemaVersion: version, ...counts };
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('CORRUPTED', 'Файл не є коректною базою даних PManager');
        } finally {
            await db?.close();
        }
    }

    private async countRecords(file: string): Promise<{ personnel: number; accounts: number }> {
        const db = await open({
            filename: file,
            driver: sqlite3.Database,
            mode: sqlite3.OPEN_READONLY,
        });
        try {
            return await this.countRecordsIn(db);
        } finally {
            await db.close();
        }
    }

    private async countRecordsIn(db: {
        get: <T>(sql: string) => Promise<T | undefined>;
    }): Promise<{ personnel: number; accounts: number }> {
        const count = async (table: string) => {
            const exists = await db.get(
                `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '${table}'`,
            );
            if (!exists) return null;
            return (await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM "${table}"`))?.n ?? 0;
        };
        return {
            personnel: (await count('users')) ?? 0,
            accounts: (await count('accounts')) ?? (await count('auth_user')) ?? 0,
        };
    }

    /**
     * Swaps live data with the content of `stagingDir` (which may be empty for a reset).
     * Current data is moved into a safety snapshot first; on failure it is moved back.
     */
    private async replaceLiveData(options: {
        reason: string;
        stagingDir: string;
        includeFiles: boolean;
    }): Promise<{ snapshot: string; from: number; to: number }> {
        const { database, migrations, templates, logger } = this.deps;
        const snapshotName = `${timestampForFileName()}__${options.reason}`;
        const snapshotDir = path.join(AppPaths.safetyBackups, snapshotName);
        await fsp.mkdir(snapshotDir, { recursive: true });

        const movedOut: [string, string][] = [];
        const movedIn: string[] = [];
        const dataDirs: readonly (typeof DATA_DIRECTORIES)[number][] = options.includeFiles
            ? DATA_DIRECTORIES
            : [];
        const liveDbExisted = fs.existsSync(AppPaths.database);

        await database.close();
        try {
            for (const suffix of DB_SIDE_FILES) {
                const from = `${AppPaths.database}${suffix}`;
                const to = path.join(snapshotDir, `${DB_FILE}${suffix}`);
                if (await move(from, to)) movedOut.push([from, to]);
            }
            for (const dir of dataDirs) {
                const to = path.join(snapshotDir, dir.name);
                if (await move(dir.resolve(), to)) movedOut.push([dir.resolve(), to]);
            }

            if (await move(path.join(options.stagingDir, DB_FILE), AppPaths.database)) {
                movedIn.push(AppPaths.database);
            }
            for (const dir of dataDirs) {
                if (await move(path.join(options.stagingDir, dir.name), dir.resolve())) {
                    movedIn.push(dir.resolve());
                }
            }

            const db = await database.get();
            const report = await migrations.run(db);
            await templates.ensureInstalled();
            await this.prune('safety', SAFETY_SNAPSHOTS_TO_KEEP);
            return { snapshot: snapshotName, from: report.from, to: migrations.latestVersion };
        } catch (err) {
            logger.error(`Replacing live data failed (${options.reason}), rolling back`, err);
            await database.close().catch(() => undefined);
            for (const target of movedIn) await remove(target).catch(() => undefined);
            // Only delete database files that are certainly not the original ones.
            const liveDbMovedOut = movedOut.some(([from]) => from === AppPaths.database);
            if (liveDbMovedOut || !liveDbExisted) {
                for (const suffix of DB_SIDE_FILES) {
                    await remove(`${AppPaths.database}${suffix}`).catch(() => undefined);
                }
            }
            for (const [original, saved] of movedOut.reverse()) {
                await move(saved, original).catch((e) => logger.error('Rollback move failed', e));
            }
            await database
                .get()
                .catch((e) => logger.error('Reopening database after rollback failed', e));
            throw err;
        }
    }

    private async prune(kind: SnapshotKind, keep: number): Promise<void> {
        const snapshots = (await this.listSnapshots()).filter((s) => s.kind === kind);
        const root = kind === 'auto' ? AppPaths.autoBackups : AppPaths.safetyBackups;
        for (const old of snapshots.slice(Math.max(1, keep))) {
            await remove(path.join(root, old.name)).catch(() => undefined);
        }
    }
}

export type { BackupFormat };
