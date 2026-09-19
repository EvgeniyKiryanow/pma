import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { DatabaseManager } from '../../src/main/db/connection';
import { migrationRunner } from '../../src/main/db/migrations';
import { EntryListStore } from '../../src/main/personnel/EntryListStore';
import { HistoryAttachments } from '../../src/main/personnel/HistoryAttachments';
import { HistoryIndexRepository } from '../../src/main/personnel/HistoryIndexRepository';
import { HistoryService } from '../../src/main/personnel/HistoryService';
import { PersonnelRepository } from '../../src/main/personnel/PersonnelRepository';
import { PersonnelService } from '../../src/main/personnel/PersonnelService';
import { ChangeJournal } from '../../src/main/sync/ChangeJournal';
import type { CommentOrHistoryEntry } from '../../src/shared/types/user';

/**
 * Timings of what every screen asks for, on a big unit: by default 1000 people with 1000
 * history entries each (a document on every entry). Not part of the normal run (timings on a
 * shared CI machine would be noise):
 *
 *     PMA_BENCH=1 npx vitest run tests/perf        (PMA_BENCH_PEOPLE / PMA_BENCH_ENTRIES)
 *
 * On a laptop (2026-09-19, v2.5): list 17 ms, red badge 0 ms, named list month 47 ms, latest
 * changes 5 ms, a card 3 ms; before v2.5: 522 / 1258 / 1651 / 1928 ms, every call blocking the
 * window.
 */

const silent = { debug() {}, info() {}, warn() {}, error() {} };
const PEOPLE = Number(process.env.PMA_BENCH_PEOPLE ?? 1000);
const ENTRIES = Number(process.env.PMA_BENCH_ENTRIES ?? 1000);

describe.runIf(process.env.PMA_BENCH)('a big unit', () => {
    it('answers every summary quickly', async () => {
        const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-bench-'));
        const database = new DatabaseManager(() => path.join(dir, 'users.db'));
        const db = () => database.get();
        await migrationRunner.run(await db());
        const people = new PersonnelRepository(db);
        const journal = new ChangeJournal(db);
        const files = new HistoryAttachments(() => path.join(dir, 'files'), silent);
        const personnel = new PersonnelService(database, people, journal, files);
        const history = new HistoryService(
            database,
            new EntryListStore<CommentOrHistoryEntry>(people, journal, 'history'),
            files,
            new HistoryIndexRepository(db),
        );
        const timings: Record<string, number> = {};
        const time = async <T>(label: string, work: () => Promise<T>): Promise<T> => {
            const started = Date.now();
            const result = await work();
            timings[label] = Date.now() - started;
            return result;
        };

        await time('seed', async () => {
            const conn = await db();
            await conn.exec('BEGIN');
            for (let p = 0; p < PEOPLE; p++) {
                const entries = Array.from({ length: ENTRIES }, (_, i) => ({
                    id: p * 100_000 + i,
                    type: i % 3 ? 'statusChange' : 'order',
                    date: new Date(2025, 0, 1 + (i % 600)).toISOString(),
                    description: `Статус змінено з "Відпустка" → "Лікарня" (${i})`,
                    status: 'Лікарня',
                    period: { from: '2025-01-01', to: '2025-01-10' },
                    files: [{ name: `scan-${i}.pdf`, type: 'application/pdf', size: 123456 }],
                }));
                await conn.run(
                    'INSERT INTO users (fullName, rank, soldierStatus, history) VALUES (?, ?, ?, ?)',
                    `Прізвище${p} Імʼя По-батькові`,
                    'солдат',
                    'Лікарня',
                    JSON.stringify(entries),
                );
            }
            await conn.exec('COMMIT');
        });

        expect(await time('personnel.list', () => personnel.list())).toHaveLength(PEOPLE);
        await time('personnel.getOne', () => personnel.getOne(5));
        await time('history.listByRange', () => history.listByRange(5, 'all'));
        await time('history.findIncomplete', () => history.findIncomplete());
        await time('history.statusPeriods(month)', () =>
            history.statusPeriods({ from: '2025-01-01', to: '2025-01-31' }),
        );
        await time('history.recentStatusChanges', () => history.recentStatusChanges(40));
        await time('history.add ×20', async () => {
            for (let i = 0; i < 20; i++) {
                await history.add(7, {
                    id: 9_000_000 + i,
                    type: 'statusChange',
                    date: new Date().toISOString(),
                    description: 'x',
                    files: [],
                } as unknown as CommentOrHistoryEntry);
            }
        });
        await time('history.remove', () => history.remove(9_000_000));
        const waiting = await (
            await db()
        ).get<{ n: number }>('SELECT COUNT(*) AS n FROM change_history');
        expect(waiting!.n).toBe(1);

        console.table(timings);
        await database.close();
        await fsp.rm(dir, { recursive: true, force: true });
    }, 900_000);
});
