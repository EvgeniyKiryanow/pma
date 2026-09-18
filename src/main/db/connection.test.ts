import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DatabaseManager } from './connection';

let dir: string;
let database: DatabaseManager;
const dbFile = () => path.join(dir, 'users.db');

beforeEach(async () => {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-db-'));
    database = new DatabaseManager(() => dbFile());
    const db = await database.get();
    await db.exec(`CREATE TABLE people (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)`);
});

afterEach(async () => {
    await database.close().catch(() => undefined);
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => undefined);
});

describe('DatabaseManager', () => {
    it('reuses one connection and reopens after close', async () => {
        const first = await database.get();
        expect(await database.get()).toBe(first);

        await database.close();
        const second = await database.get();
        expect(second).not.toBe(first);
        // Data survived the reopen.
        expect((await second.get(`SELECT COUNT(*) AS n FROM people`)).n).toBe(0);
    });

    it('opens the database in WAL mode with foreign keys on', async () => {
        const db = await database.get();
        expect((await db.get(`PRAGMA journal_mode`)).journal_mode).toBe('wal');
        expect((await db.get(`PRAGMA foreign_keys`)).foreign_keys).toBe(1);
    });

    it('commits a transaction', async () => {
        await database.transaction(async (db) => {
            await db.run(`INSERT INTO people (name) VALUES ('Перший')`);
            await db.run(`INSERT INTO people (name) VALUES ('Другий')`);
        });
        const db = await database.get();
        expect((await db.get(`SELECT COUNT(*) AS n FROM people`)).n).toBe(2);
    });

    it('rolls the whole transaction back on an error', async () => {
        await expect(
            database.transaction(async (db) => {
                await db.run(`INSERT INTO people (name) VALUES ('Перший')`);
                throw new Error('щось пішло не так');
            }),
        ).rejects.toThrow('щось пішло не так');

        const db = await database.get();
        expect((await db.get(`SELECT COUNT(*) AS n FROM people`)).n).toBe(0);
    });

    it('queues transactions instead of nesting them', async () => {
        // Two IPC calls can arrive at the same time; SQLite has no nested transactions,
        // so they must not overlap on the shared connection.
        const order: string[] = [];
        await Promise.all([
            database.transaction(async (db) => {
                order.push('first-start');
                await db.run(`INSERT INTO people (name) VALUES ('Перший')`);
                order.push('first-end');
            }),
            database.transaction(async (db) => {
                order.push('second-start');
                await db.run(`INSERT INTO people (name) VALUES ('Другий')`);
                order.push('second-end');
            }),
        ]);

        expect(order).toEqual(['first-start', 'first-end', 'second-start', 'second-end']);
        const db = await database.get();
        expect((await db.get(`SELECT COUNT(*) AS n FROM people`)).n).toBe(2);
    });

    it('keeps the queue working after a failed transaction', async () => {
        await expect(
            database.transaction(async () => {
                throw new Error('перша впала');
            }),
        ).rejects.toThrow();

        await database.transaction(async (db) => {
            await db.run(`INSERT INTO people (name) VALUES ('Після збою')`);
        });
        const db = await database.get();
        expect((await db.get(`SELECT COUNT(*) AS n FROM people`)).n).toBe(1);
    });

    it('writes a consistent snapshot of a live database', async () => {
        await database.transaction(async (db) => {
            await db.run(`INSERT INTO people (name) VALUES ('Перший')`);
        });

        const snapshot = path.join(dir, 'snapshot.sqlite');
        await database.snapshotTo(snapshot);
        expect((await fsp.stat(snapshot)).size).toBeGreaterThan(0);

        const copy = new DatabaseManager(() => snapshot);
        const copyDb = await copy.get();
        expect((await copyDb.get(`SELECT name FROM people`)).name).toBe('Перший');
        await copy.close();
    });

    it('overwrites an existing snapshot file', async () => {
        const snapshot = path.join(dir, 'snapshot.sqlite');
        await database.snapshotTo(snapshot);
        await expect(database.snapshotTo(snapshot)).resolves.toBeUndefined();
    });

    it('reports a healthy database', async () => {
        const result = await database.checkIntegrity();
        expect(result.ok).toBe(true);
        expect(result.details).toBe('ok');
    });

    it('reports a damaged database instead of working with it', async () => {
        await database.transaction(async (db) => {
            for (let i = 0; i < 500; i++) {
                await db.run(`INSERT INTO people (name) VALUES ('Особа ${i} ${'x'.repeat(200)}')`);
            }
        });
        await database.close(); // checkpoints the WAL into the file

        // Overwrite a data page in the middle of the file, as a failing disk would.
        const { size } = await fsp.stat(dbFile());
        const handle = await fsp.open(dbFile(), 'r+');
        await handle.write(Buffer.alloc(1200, 0xff), 0, 1200, Math.floor(size / 2));
        await handle.close();

        const result = await database.checkIntegrity();
        expect(result.ok).toBe(false);
        expect(result.details).not.toBe('ok');
    });
});
