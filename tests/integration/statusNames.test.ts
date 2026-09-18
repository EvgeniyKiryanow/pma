import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { DatabaseManager } from '../../src/main/db/connection';
import { migrationRunner, MIGRATIONS } from '../../src/main/db/migrations';
import { MigrationRunner } from '../../src/main/db/migrations/runner';
import { userToRow } from '../../src/main/personnel/userFields';

const OLD = 'Бронєгрупа';
const NEW = 'Бронегрупа';
let dir: string;
let database: DatabaseManager;

afterEach(async () => {
    await database?.close().catch(() => undefined);
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => undefined);
});

describe('corrected status names (migration 8)', () => {
    it('renames the status, the previous status and the word in history texts', async () => {
        dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-status-'));
        database = new DatabaseManager(() => path.join(dir, 'users.db'));
        const db = await database.get();
        // A data set of version 2.0.0 (schema 7).
        await new MigrationRunner(MIGRATIONS.slice(0, 7)).run(db);
        const history = JSON.stringify([
            {
                id: 1,
                type: 'statusChange',
                description: `Статус змінено з "Позиція піхоти" → "${OLD}"`,
                content: `Статус змінено з "Позиція піхоти" на "${OLD}"`,
                files: [],
            },
        ]);
        await db.run(
            `INSERT INTO users (fullName, dateOfBirth, soldierStatus, previousStatus, history) VALUES (?, ?, ?, ?, ?)`,
            'Перший Тест',
            '1990-01-01',
            OLD,
            OLD,
            history,
        );
        await db.run(
            `INSERT INTO users (fullName, dateOfBirth, soldierStatus, history) VALUES (?, ?, ?, ?)`,
            'Другий Тест',
            '1991-01-01',
            'Позиція піхоти',
            '[]',
        );

        await migrationRunner.run(db);

        const rows = await db.all<
            { soldierStatus: string; previousStatus: string; history: string }[]
        >(`SELECT soldierStatus, previousStatus, history FROM users ORDER BY id`);
        expect(rows[0].soldierStatus).toBe(NEW);
        expect(rows[0].previousStatus).toBe(NEW);
        expect(rows[0].history).not.toContain(OLD);
        expect(JSON.parse(rows[0].history)[0].description).toBe(
            `Статус змінено з "Позиція піхоти" → "${NEW}"`,
        );
        expect(rows[1]).toEqual({
            soldierStatus: 'Позиція піхоти',
            previousStatus: null,
            history: '[]',
        });
    });

    it('stores an old spelling that still arrives under the current name', () => {
        const [status, previous, name] = userToRow(
            { soldierStatus: OLD, previousStatus: 'Відпустка', fullName: OLD },
            ['soldierStatus', 'previousStatus', 'fullName'],
        );
        expect(status).toBe(NEW);
        expect(previous).toBe('Відпустка');
        // Only status columns are touched.
        expect(name).toBe(OLD);
    });
});
