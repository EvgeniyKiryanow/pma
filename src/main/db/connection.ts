import fs from 'fs';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

import { createLogger } from '../core/logger';
import { AppPaths } from '../core/paths';
import type { Db } from './types';

const logger = createLogger('db');

/**
 * Owns the single SQLite connection of the main process.
 * The connection can be closed and reopened (restore, reset) — always obtain it through
 * `get()` instead of caching the handle.
 */
export class DatabaseManager {
    private db: Db | null = null;
    private opening: Promise<Db> | null = null;
    private txQueue: Promise<unknown> = Promise.resolve();

    constructor(private readonly filePath: () => string = () => AppPaths.database) {}

    get path(): string {
        return this.filePath();
    }

    async get(): Promise<Db> {
        if (this.db) return this.db;
        if (!this.opening) {
            this.opening = this.open().finally(() => {
                this.opening = null;
            });
        }
        return this.opening;
    }

    exists(): boolean {
        return fs.existsSync(this.path);
    }

    async close(): Promise<void> {
        const db = this.db;
        this.db = null;
        if (!db) return;
        try {
            // Keeps query plans healthy as the data grows, then flushes the WAL into the file
            // so the database is a single consistent file when the app is not running.
            await db.exec('PRAGMA optimize;');
            await db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
        } catch (err) {
            logger.warn('Optimize/checkpoint before close failed', err);
        }
        await db.close();
        logger.info('Database closed');
    }

    /**
     * Cheap structural check of the open database. Reports damage early (disk problems,
     * a file copied while the app was running) instead of letting it surface as odd errors.
     */
    async checkIntegrity(): Promise<{ ok: boolean; details: string; durationMs: number }> {
        const db = await this.get();
        const started = Date.now();
        const row = await db.get<{ quick_check: string }>('PRAGMA quick_check(1)');
        const details = row?.quick_check ?? 'unknown';
        const durationMs = Date.now() - started;
        if (details !== 'ok') logger.error(`Database integrity check failed: ${details}`);
        else logger.info(`Database integrity check passed in ${durationMs} ms`);
        return { ok: details === 'ok', details, durationMs };
    }

    /**
     * Runs `work` inside BEGIN IMMEDIATE / COMMIT. Transactions are queued so two IPC calls
     * never try to open a transaction on the shared connection at the same time.
     */
    async transaction<T>(work: (db: Db) => Promise<T>): Promise<T> {
        const run = async () => {
            const db = await this.get();
            await db.exec('BEGIN IMMEDIATE');
            try {
                const result = await work(db);
                await db.exec('COMMIT');
                return result;
            } catch (err) {
                await db.exec('ROLLBACK').catch(() => undefined);
                throw err;
            }
        };
        const next = this.txQueue.then(run, run);
        this.txQueue = next.catch(() => undefined);
        return next;
    }

    /** Consistent, compacted copy of the live database (works while the app is running). */
    async snapshotTo(targetFile: string): Promise<void> {
        const db = await this.get();
        if (fs.existsSync(targetFile)) fs.rmSync(targetFile);
        await db.run('VACUUM INTO ?', targetFile);
    }

    private async open(): Promise<Db> {
        const db = (await open({ filename: this.path, driver: sqlite3.Database })) as Db;
        await db.exec(`
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA foreign_keys = ON;
            PRAGMA busy_timeout = 5000;
            PRAGMA temp_store = MEMORY;
        `);
        this.db = db;
        logger.info('Database opened');
        return db;
    }
}

export const database = new DatabaseManager();
