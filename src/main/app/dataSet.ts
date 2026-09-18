import fs from 'fs';
import path from 'path';

import { AppError } from '../../shared/ipc/result';
import { move, timestampForFileName } from '../core/fsUtils';
import type { Logger } from '../core/logger';
import { AppPaths, PRIVATE_DATA_DIRECTORIES } from '../core/paths';
import { isPlainDatabaseFile } from '../db/driver';
import type { MigrationReport } from '../db/migrations/runner';
import type { Container } from './container';

const DATABASE_FILES = ['', '-wal', '-shm', '-journal'];

export type DataKeyState =
    /** The data set can be opened now; `setAside` is where unreadable old data was moved. */
    | { state: 'unlocked'; setAside: string | null }
    /** Windows could not open the key: the first PManager sign-in does (security/DataGate). */
    | { state: 'locked' };

export type OpenedDataSet = { migrations: MigrationReport; setAside: string | null };

/**
 * Loads the key of this computer's data set. A first start and data of versions without
 * encryption get a new key. Data encrypted with a key nobody here can open any more is moved
 * into a folder of its own (never deleted) and a new data set starts.
 */
export async function prepareDataKey(container: Container, logger: Logger): Promise<DataKeyState> {
    const { vault } = container;
    const state = await vault.load();
    if (state === 'unlocked') return { state, setAside: null };
    if (state === 'locked' && vault.hasPasswordCopies) {
        logger.warn('Windows could not open the data key; the next sign-in opens the data');
        return { state };
    }

    let setAside: string | null = null;
    if (state === 'locked' || hasEncryptedDatabase()) {
        setAside = await setAsideData({ withKeystore: state === 'locked' });
        logger.error(`Data without a usable key was moved to ${setAside}`);
    }
    await vault.create();
    logger.info('A new data key was created');
    return { state: 'unlocked', setAside };
}

/**
 * Opens the data set once its key is available: data of older versions is encrypted first,
 * then the database is checked and migrated (after a safety copy) and the templates installed.
 */
export async function openDataSet(container: Container, logger: Logger): Promise<OpenedDataSet> {
    await encryptLegacyData(container, logger);

    let setAside: string | null = null;
    let db;
    try {
        db = await container.database.get();
    } catch (err) {
        // The key is open but does not fit the database: a file copied from another
        // computer, or one damaged beyond reading. It is kept aside; a new data set starts.
        if (!(err instanceof AppError && err.code === 'DATA_LOCKED')) throw err;
        setAside = await setAsideData({ withKeystore: false });
        logger.error(`The database does not open with this key; moved to ${setAside}`);
        db = await container.database.get();
    }

    const tables = await db.get<{ n: number }>(
        `SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'`,
    );
    const isExistingDatabase = (tables?.n ?? 0) > 0;

    // Never migrate or write into a damaged database: that would turn a recoverable
    // problem into lost data. The user is told to restore a backup instead.
    if (isExistingDatabase) {
        const integrity = await container.database.checkIntegrity();
        if (!integrity.ok) throw new AppError('CORRUPTED', integrity.details);
    }

    const migrations = await container.migrations.run(db, {
        log: (message) => logger.info(message),
        beforeMigrate: async (from, to) => {
            if (!isExistingDatabase) return;
            const snapshot = await container.backups.createSafetyDatabaseSnapshot(
                `pre-migration-v${from}-to-v${to}`,
            );
            logger.info(`Safety snapshot before migration: ${snapshot}`);
        },
    });
    await container.templates.ensureInstalled();
    return { migrations, setAside };
}

/** Everything older versions wrote unencrypted (and what an interrupted run left over). */
async function encryptLegacyData(container: Container, logger: Logger): Promise<void> {
    const { encryptor } = container;
    const database = await encryptor.encryptDatabase(AppPaths.database);
    let files = 0;
    for (const dir of PRIVATE_DATA_DIRECTORIES) {
        files += await encryptor.encryptFiles(dir.resolve());
    }
    const copies = await encryptor.encryptSnapshots(
        AppPaths.autoBackups,
        AppPaths.safetyBackups,
        PRIVATE_DATA_DIRECTORIES.map((dir) => dir.name),
    );
    if (database || files || copies.databases || copies.files) {
        logger.info(
            `Encrypted: database ${database ? 'yes' : 'no'}, ${files} files, ` +
                `${copies.databases} local copies, ${copies.files} files in copies`,
        );
    }
}

function hasEncryptedDatabase(): boolean {
    const file = AppPaths.database;
    return fs.existsSync(file) && fs.statSync(file).size > 0 && !isPlainDatabaseFile(file);
}

/** Moves the data set (and its local copies) into `backups/unreadable/<time>/`. */
async function setAsideData(options: { withKeystore: boolean }): Promise<string> {
    const folder = path.join(AppPaths.backupsRoot, 'unreadable', timestampForFileName());
    for (const suffix of DATABASE_FILES) {
        await move(`${AppPaths.database}${suffix}`, path.join(folder, `users.db${suffix}`));
    }
    for (const dir of PRIVATE_DATA_DIRECTORIES) {
        await move(dir.resolve(), path.join(folder, dir.name));
    }
    await move(AppPaths.autoBackups, path.join(folder, 'backups', 'auto'));
    await move(AppPaths.safetyBackups, path.join(folder, 'backups', 'safety'));
    if (options.withKeystore) await move(AppPaths.keystoreFile, path.join(folder, 'keystore.json'));
    return folder;
}
