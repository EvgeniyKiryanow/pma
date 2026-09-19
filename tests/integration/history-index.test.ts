import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DatabaseManager } from '../../src/main/db/connection';
import { openDatabase } from '../../src/main/db/driver';
import { MIGRATIONS, migrationRunner } from '../../src/main/db/migrations';
import { MigrationRunner } from '../../src/main/db/migrations/runner';
import { EntryListStore } from '../../src/main/personnel/EntryListStore';
import { HistoryAttachments } from '../../src/main/personnel/HistoryAttachments';
import { HistoryIndexRepository } from '../../src/main/personnel/HistoryIndexRepository';
import { HistoryService } from '../../src/main/personnel/HistoryService';
import { PersonnelRepository } from '../../src/main/personnel/PersonnelRepository';
import { PersonnelService } from '../../src/main/personnel/PersonnelService';
import { ChangeApplier } from '../../src/main/sync/ChangeApplier';
import { ChangeExchangeService } from '../../src/main/sync/ChangeExchangeService';
import { ChangeJournal } from '../../src/main/sync/ChangeJournal';
import { ChangeLogFile } from '../../src/main/sync/ChangeLogFile';
import { statusOfEntry } from '../../src/shared/helpers/statusHistory';
import type { CommentOrHistoryEntry } from '../../src/shared/types/user';

/**
 * Summaries of everyone's history come from `history_index` (migration 15), kept by
 * triggers. They must say exactly what reading every JSON array used to say, and stay
 * right whoever writes the history: the app, an imported change log, a migrated database.
 */

const silent = { debug() {}, info() {}, warn() {}, error() {} };
let dir: string;
let database: DatabaseManager;
let personnel: PersonnelService;
let history: HistoryService;
let journal: ChangeJournal;

const db = () => database.get();

beforeEach(async () => {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-history-index-'));
    database = new DatabaseManager(() => path.join(dir, 'users.db'));
    await migrationRunner.run(await db());
    const people = new PersonnelRepository(db);
    journal = new ChangeJournal(db);
    const files = new HistoryAttachments(() => path.join(dir, 'files'), silent);
    personnel = new PersonnelService(database, people, journal, files);
    history = new HistoryService(
        database,
        new EntryListStore<CommentOrHistoryEntry>(people, journal, 'history'),
        files,
        new HistoryIndexRepository(db),
    );
});

afterEach(async () => {
    await database.close();
    await fsp.rm(dir, { recursive: true, force: true });
});

let nextId = 1000;
/** Periods of real data may lack their end (or be anything else): typed loosely here. */
type Loose = Omit<Partial<CommentOrHistoryEntry>, 'period'> & { period?: unknown };
const change = (extra: Loose): CommentOrHistoryEntry =>
    ({
        id: nextId++,
        type: 'statusChange',
        date: '2026-09-01T10:00:00.000Z',
        author: 'test',
        description: '',
        content: '',
        files: [],
        ...extra,
    }) as CommentOrHistoryEntry;

/** Everything a real data set holds: current and legacy shapes, odd values. */
const VARIETY = (): CommentOrHistoryEntry[] => [
    change({
        status: 'Відпустка',
        period: { from: '2026-09-02', to: '2026-09-12' },
        files: [{ name: 'a.pdf' }] as never,
    }),
    change({
        description: 'Статус змінено з "Позиція піхоти" → "Лікарня"',
        period: { from: '05.09.2026', to: '20.09.2026' },
    }),
    change({ status: 'СЗЧ', previousStatus: 'Відпустка', date: '2026-09-15T08:00:00.000Z' }),
    change({ status: '  ', content: 'з "А" → "Відрядження"', period: { from: '2026-10-01' } }),
    change({
        status: 'ВЛК',
        period: { from: ' 01.08.2026', to: ' 03.08.2026' },
        files: [{ name: 'b.pdf' }] as never,
    }),
    change({ type: 'order', description: 'Наказ', period: { from: '2026-09-01' } }),
    change({ status: 'Шпиталь', period: {} as never, date: '2026-08-01T00:00:00.000Z' }),
    change({ status: 'Відпустка', period: null as never, files: 'not an array' as never }),
    { note: 'not an entry' } as never,
];

/** The summaries as HistoryService computed them before the index: parsing every list. */
async function reference() {
    const rows = await (
        await db()
    ).all<{ id: number; shpkNumber: string | null; history: string | null }[]>(
        'SELECT id, shpkNumber, history FROM users',
    );
    const owners = rows.map((row) => ({
        userId: row.id,
        shpkNumber: row.shpkNumber,
        entries: (() => {
            try {
                const parsed = JSON.parse(row.history ?? '[]');
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        })() as CommentOrHistoryEntry[],
    }));
    const incomplete = [];
    const periods = [];
    const recent = [];
    for (const { userId, shpkNumber, entries } of owners) {
        const shpk = String(shpkNumber ?? '');
        const exempt = shpk === 'excluded' || shpk.includes('order');
        for (const entry of entries) {
            if (entry?.type !== 'statusChange') continue;
            const status = statusOfEntry(entry);
            if (!exempt) {
                const noFiles = !Array.isArray(entry.files) || entry.files.length === 0;
                const noPeriod = !entry.period;
                if (noFiles || noPeriod) {
                    incomplete.push({
                        userId,
                        entryId: entry.id,
                        reason:
                            noFiles && noPeriod
                                ? 'missing_both'
                                : noFiles
                                  ? 'missing_file'
                                  : 'missing_period',
                    });
                }
            }
            if (entry.period?.from && status) {
                periods.push({
                    userId,
                    entryId: entry.id,
                    date: entry.date,
                    status,
                    from: entry.period.from,
                    to: entry.period.to || null,
                });
            }
            if (status) {
                const previous =
                    entry.previousStatus?.trim() ||
                    /з\s*"([^"]+)"\s*→/.exec(`${entry.description ?? ''}`)?.[1] ||
                    null;
                recent.push({
                    userId,
                    entryId: entry.id,
                    date: entry.date,
                    from: previous && previous !== '—' ? previous : null,
                    to: status,
                    period: entry.period?.from ? entry.period : null,
                    hasFiles: Array.isArray(entry.files) && entry.files.length > 0,
                });
            }
        }
    }
    recent.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return { incomplete, periods, recent };
}

async function person(name: string, entries: CommentOrHistoryEntry[], shpkNumber?: string) {
    const created = await personnel.create({ fullName: name, shpkNumber });
    await (
        await db()
    ).run('UPDATE users SET history = ? WHERE id = ?', JSON.stringify(entries), created.id);
    return created.id;
}

const indexRows = async () =>
    (await (await db()).get<{ n: number }>('SELECT COUNT(*) AS n FROM history_index'))!.n;

describe('history summaries from the index', () => {
    it('say exactly what reading every list said', async () => {
        await person('Перший', VARIETY());
        await person('Другий', VARIETY());
        await person('Виключений', VARIETY(), 'excluded');
        await person('Розпорядження', VARIETY(), 'order:7');
        await person('Без історії', []);
        const odd = await personnel.create({ fullName: 'Історія-обʼєкт' });
        await (await db()).run(`UPDATE users SET history = '{"a":1}' WHERE id = ?`, odd.id);

        const expected = await reference();
        expect(await history.findIncomplete()).toEqual(expected.incomplete);
        expect(await history.statusPeriods()).toEqual(expected.periods);
        expect(await history.recentStatusChanges(500)).toEqual(expected.recent);
        expect(await history.recentStatusChanges(3)).toEqual(expected.recent.slice(0, 3));
    });

    it('asked for a month, return every period that may touch it and none that cannot', async () => {
        await person('Перший', VARIETY());
        const september = await history.statusPeriods({ from: '2026-09-01', to: '2026-09-30' });
        const ids = september.map((period) => period.from);
        // ISO and dotted bounds are compared as days; bounds that are not plain dates (a stray
        // space) never filter a period out — the screens read them themselves.
        expect(ids).toEqual(['2026-09-02', '05.09.2026', ' 01.08.2026']);
        const october = await history.statusPeriods({ from: '2026-10-01', to: '2026-10-31' });
        expect(october.map((period) => period.status)).toEqual(['Відрядження', 'ВЛК']);
    });

    it('follow every change of the history', async () => {
        const id = await person('Перший', []);
        await history.add(id, change({ id: 1, status: 'Відпустка' }));
        await history.add(id, change({ id: 2, status: 'Лікарня', period: { from: '2026-09-01' } }));
        expect(await indexRows()).toBe(2);
        expect((await history.findIncomplete()).map((row) => row.reason)).toEqual([
            'missing_both',
            'missing_file',
        ]);

        await history.edit(
            id,
            change({
                id: 1,
                status: 'Відпустка',
                period: { from: '2026-09-01' },
                files: [{ name: 'x.txt', dataUrl: 'data:text/plain;base64,eA==' }] as never,
            }),
        );
        expect((await history.findIncomplete()).map((row) => row.entryId)).toEqual([2]);

        expect(await history.remove(2)).toBe(id);
        expect(await history.findIncomplete()).toEqual([]);
        await expect(history.remove(2)).rejects.toMatchObject({ code: 'NOT_FOUND' });

        await personnel.remove(id);
        expect(await indexRows()).toBe(0);
    });

    it('follow a person that arrives or changes through a change log', async () => {
        const applier = new ChangeApplier(await db());
        const entries = [change({ id: 5, status: 'СЗЧ' })];
        await applier.apply({
            table_name: 'users',
            record_id: 99,
            operation: 'insert',
            data: { id: 99, uuid: 'u-99', fullName: 'Прибулий', history: JSON.stringify(entries) },
        });
        expect((await history.findIncomplete()).map((row) => row.entryId)).toEqual([5]);
        await applier.apply({
            table_name: 'users',
            record_id: 99,
            operation: 'update',
            data: { id: 99, uuid: 'u-99', fullName: 'Прибулий', history: '[]' },
        });
        expect(await indexRows()).toBe(0);
    });

    it('is built for the history already in an older database', async () => {
        const fixtures = path.resolve('fixtures/db');
        for (const name of fs.readdirSync(fixtures)) {
            const file = path.join(dir, name);
            fs.copyFileSync(path.join(fixtures, name), file);
            const old = openDatabase(file);
            await migrationRunner.run(old);
            const expected = await old.get<{ n: number }>(
                `SELECT COALESCE(SUM(json_array_length(history)), 0) AS n FROM users
                 WHERE json_valid(history) AND json_type(history) = 'array'`,
            );
            const actual = await old.get<{ n: number }>('SELECT COUNT(*) AS n FROM history_index');
            await old.close();
            expect([name, actual!.n]).toEqual([name, expected!.n]);
        }
    });
});

describe('the users table', () => {
    it('keeps history, comments and the photo at the end of the row, and every id', async () => {
        const columns = (
            await (await db()).all<{ name: string }[]>('PRAGMA table_info(users)')
        ).map((column) => column.name);
        expect(columns.slice(-3)).toEqual(['history', 'comments', 'photo']);
        expect(columns).toContain('photoThumb');
    });

    it('rebuilt on older data: same rows, triggers and indexes, ids never reused', async () => {
        for (const name of fs.readdirSync(path.resolve('fixtures/db'))) {
            const file = path.join(dir, `ids-${name}`);
            fs.copyFileSync(path.join('fixtures/db', name), file);
            const old = openDatabase(file);
            try {
                // Up to the version before the rebuild; a person added and deleted there.
                await new MigrationRunner(MIGRATIONS.slice(0, 17)).run(old);
                const before = await old.all<{ id: number; fullName: string }[]>(
                    'SELECT id, fullName FROM users ORDER BY id',
                );
                await old.run(`INSERT INTO users (fullName) VALUES ('Тимчасовий')`);
                const removed = (await old.get<{ id: number }>('SELECT MAX(id) AS id FROM users'))!
                    .id;
                await old.run('DELETE FROM users WHERE id = ?', removed);
                await migrationRunner.run(old);
                const after = await old.all<{ id: number; fullName: string }[]>(
                    'SELECT id, fullName FROM users ORDER BY id',
                );
                expect(after).toEqual(before);
                await old.run(
                    `INSERT INTO users (fullName, history) VALUES ('Новий', '[{"id":1,"type":"statusChange"}]')`,
                );
                const fresh = await old.get<{ id: number; uuid: string }>(
                    `SELECT id, uuid FROM users WHERE fullName = 'Новий'`,
                );
                expect(fresh!.id).toBeGreaterThan(removed);
                expect(fresh!.uuid).toBeTruthy();
                const indexed = await old.get<{ n: number }>(
                    'SELECT COUNT(*) AS n FROM history_index WHERE user_id = ?',
                    fresh!.id,
                );
                expect(indexed!.n).toBe(1);
            } finally {
                await old.close();
            }
        }
    });
});

describe('the change log', () => {
    const waiting = async () =>
        (await (
            await db()
        ).all<{ operation: string; data: string }[]>(
            `SELECT operation, data FROM change_history ORDER BY id`,
        )) as { operation: string; data: string }[];

    it('keeps one entry per person however often the history changes', async () => {
        const { id } = await personnel.create({ fullName: 'Іваненко' });
        for (let i = 0; i < 25; i++)
            await history.add(id, change({ id: 10 + i, status: 'Відпустка' }));
        const entries = await waiting();
        expect(entries.map((entry) => entry.operation)).toEqual(['insert']);
        expect(JSON.parse(JSON.parse(entries[0].data).history)).toHaveLength(25);
    });

    it('does not lose a change made while the file was being written', async () => {
        const { id } = await personnel.create({ fullName: 'Іваненко' });
        const exchange = new ChangeExchangeService(
            database,
            journal,
            new ChangeLogFile(() => path.join(dir, '.staging')),
            silent,
        );
        const file = path.join(dir, 'out.pmc');
        const result = await exchange.exportChanges('Obmin-Parol-2026', async () => {
            // The person is edited while the export waits for the file name.
            await personnel.update(id, { fullName: 'Іваненко', rank: 'сержант' });
            return file;
        });
        expect(result.exported).toBe(1);
        const left = await waiting();
        expect(left).toHaveLength(1);
        expect(JSON.parse(left[0].data).rank).toBe('сержант');
    });

    it('starts a new entry after a deletion', async () => {
        const { id } = await personnel.create({ fullName: 'Іваненко' });
        await personnel.remove(id);
        await journal.record('users', id, 'update', { id, fullName: 'знову' });
        expect((await waiting()).map((entry) => entry.operation)).toEqual([
            'insert',
            'delete',
            'update',
        ]);
    });
});
