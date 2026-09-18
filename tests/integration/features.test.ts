import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ModuleContext } from '../../src/main/app/module';
import { DatabaseManager } from '../../src/main/db/connection';
import { migrationRunner } from '../../src/main/db/migrations';
import { DirectiveRepository } from '../../src/main/directives/DirectiveRepository';
import { DirectiveService } from '../../src/main/directives/DirectiveService';
import { NamedListRepository } from '../../src/main/named-list/NamedListRepository';
import { NamedListService } from '../../src/main/named-list/NamedListService';
import { CommentService } from '../../src/main/personnel/CommentService';
import { EntryListStore } from '../../src/main/personnel/EntryListStore';
import { HistoryAttachments } from '../../src/main/personnel/HistoryAttachments';
import { HistoryService } from '../../src/main/personnel/HistoryService';
import { PersonnelRepository } from '../../src/main/personnel/PersonnelRepository';
import { PersonnelService } from '../../src/main/personnel/PersonnelService';
import { ReportFileStore } from '../../src/main/reports/ReportFileStore';
import { ReportTemplateRepository } from '../../src/main/reports/ReportTemplateRepository';
import { ReportTemplateService } from '../../src/main/reports/ReportTemplateService';
import { StaffingRepository } from '../../src/main/staffing/StaffingRepository';
import { StaffingService } from '../../src/main/staffing/StaffingService';
import { ChangeExchangeService } from '../../src/main/sync/ChangeExchangeService';
import { ChangeJournal } from '../../src/main/sync/ChangeJournal';
import { ChangeLogFile } from '../../src/main/sync/ChangeLogFile';
import type { CommentOrHistoryEntry } from '../../src/shared/types/user';

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
const PASSWORD = 'Obmin-Parol-2026';

/** All feature services on one freshly migrated database in its own folder. */
async function createWorld(dir: string) {
    await fsp.mkdir(dir, { recursive: true });
    const database = new DatabaseManager(() => path.join(dir, 'users.db'));
    await migrationRunner.run(await database.get());

    const db = () => database.get();
    const context: ModuleContext = {
        db,
        transactor: database,
        journal: new ChangeJournal(db),
        createLogger: () => silentLogger,
    };
    const { transactor, journal } = context;
    const people = new PersonnelRepository(db);

    return {
        dir,
        database,
        journal,
        personnel: new PersonnelService(transactor, people, journal),
        history: new HistoryService(
            transactor,
            new EntryListStore<CommentOrHistoryEntry>(people, journal, 'history'),
            new HistoryAttachments(() => path.join(dir, 'history_files'), silentLogger),
        ),
        comments: new CommentService(
            transactor,
            new EntryListStore<CommentOrHistoryEntry>(people, journal, 'comments'),
        ),
        directives: new DirectiveService(transactor, new DirectiveRepository(db), journal),
        staffing: new StaffingService(transactor, new StaffingRepository(db), journal),
        namedList: new NamedListService(transactor, new NamedListRepository(db), journal),
        templates: new ReportTemplateService(
            transactor,
            new ReportTemplateRepository(db),
            new ReportFileStore(() => path.join(dir, 'reports')),
            journal,
        ),
        exchange: new ChangeExchangeService(
            transactor,
            journal,
            new ChangeLogFile(() => path.join(dir, '.staging')),
            silentLogger,
        ),
    };
}

type World = Awaited<ReturnType<typeof createWorld>>;

let root: string;
let world: World;

beforeEach(async () => {
    root = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-features-'));
    world = await createWorld(path.join(root, 'main'));
});

afterEach(async () => {
    await world.database.close().catch((): void => undefined);
    await fsp.rm(root, { recursive: true, force: true }).catch((): void => undefined);
});

const person = (fullName: string, extra: Record<string, unknown> = {}) => ({
    fullName,
    dateOfBirth: '1990-05-01',
    rank: 'солдат',
    relatives: [{ name: 'Мати', relationship: 'мати' }],
    ...extra,
});

const entry = (id: number, extra: Partial<CommentOrHistoryEntry> = {}): CommentOrHistoryEntry => ({
    id,
    date: new Date().toISOString(),
    type: 'text',
    content: `Запис ${id}`,
    files: [],
    ...extra,
});

async function journalOf(table: string) {
    return (await world.journal.pendingLocal()).filter((c) => c.table_name === table);
}

describe('personnel', () => {
    it('creates, lists, updates and deletes a person, journaling each change', async () => {
        const created = await world.personnel.create(person('Іваненко Іван Іванович'));
        expect(created.id).toBeGreaterThan(0);
        expect(created.relatives).toEqual([{ name: 'Мати', relationship: 'мати' }]);

        const [listed] = await world.personnel.list();
        expect(listed.fullName).toBe('Іваненко Іван Іванович');
        expect(listed).not.toHaveProperty('history');
        expect(listed).not.toHaveProperty('comments');

        const updated = await world.personnel.update(created.id, {
            ...person('Іваненко Іван Іванович'),
            rank: 'сержант',
        });
        expect(updated.rank).toBe('сержант');

        expect(await world.personnel.remove(created.id)).toBe(true);
        expect(await world.personnel.remove(created.id)).toBe(false);
        expect(await world.personnel.getOne(created.id)).toBeNull();

        const operations = (await journalOf('users')).map((c) => c.operation);
        expect(operations).toEqual(['insert', 'update', 'delete']);
    });

    it('never touches history and comments on a full update', async () => {
        const { id } = await world.personnel.create(person('Петренко Петро'));
        await world.history.add(id, entry(1));
        await world.comments.add(id, entry(2));

        // The personnel list is loaded without history/comments; saving it must not wipe them.
        await world.personnel.update(id, { ...person('Петренко Петро'), history: [], comments: [] });

        expect(await world.history.listByRange(id, 'all')).toHaveLength(1);
        expect(await world.comments.list(id)).toHaveLength(1);
    });

    it('reports a missing person on update', async () => {
        await expect(world.personnel.update(999, person('Ніхто'))).rejects.toMatchObject({
            code: 'NOT_FOUND',
        });
    });

    it('assigns staff positions in bulk and skips unknown people', async () => {
        const { id } = await world.personnel.create(person('Сидоренко Сидір'));
        await world.personnel.bulkUpdateAssignments([
            { id, position: 'стрілець', unitMain: '1 взвод', shpkNumber: '12' },
            { id: 999, position: 'водій' },
        ]);
        const saved = await world.personnel.getOne(id);
        expect(saved.position).toBe('стрілець');
        expect(saved.unitMain).toBe('1 взвод');
    });

    it('lists the database columns', async () => {
        const columns = await world.personnel.listColumns();
        expect(columns).toEqual(expect.arrayContaining(['id', 'uuid', 'fullName', 'shpkNumber']));
    });
});

describe('history and comments', () => {
    const attachment = { name: 'наказ.pdf', type: 'application/pdf', size: 5 };
    const dataUrl = `data:application/pdf;base64,${Buffer.from('hello').toString('base64')}`;

    it('stores attachments on disk and keeps only their metadata in the entry', async () => {
        const { id } = await world.personnel.create(person('Коваленко Олег'));
        await world.history.add(id, entry(10, { files: [{ ...attachment, dataUrl }] }));

        const [saved] = await world.history.listByRange(id, 'all');
        expect(saved.files).toEqual([attachment]);
        const loaded = await world.history.loadFile(id, 10, attachment.name);
        expect(loaded.dataUrl).toBe(dataUrl);
    });

    it('deletes attachments removed during an edit, and the whole folder on delete', async () => {
        const { id } = await world.personnel.create(person('Бондар Андрій'));
        await world.history.add(id, entry(11, { files: [{ ...attachment, dataUrl }] }));

        await world.history.edit(id, entry(11, { content: 'змінено', files: [] }));
        await expect(world.history.loadFile(id, 11, attachment.name)).rejects.toThrow(
            'Файл не знайдено',
        );
        expect((await world.history.listByRange(id, 'all'))[0].content).toBe('змінено');

        expect(await world.history.remove(11)).toBe(id);
        expect(await world.history.listByRange(id, 'all')).toEqual([]);
        expect(fs.existsSync(path.join(world.dir, 'history_files', String(id), '11'))).toBe(false);
        await expect(world.history.remove(11)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('filters history by period', async () => {
        const { id } = await world.personnel.create(person('Мельник Тарас'));
        const old = new Date();
        old.setDate(old.getDate() - 20);
        await world.history.add(id, entry(1));
        await world.history.add(id, entry(2, { date: old.toISOString() }));

        expect(await world.history.listByRange(id, '7d')).toHaveLength(1);
        expect(await world.history.listByRange(id, '30d')).toHaveLength(2);
        expect(await world.history.list(id, '14days')).toHaveLength(1);
        expect(await world.history.list(id, 'unknown')).toHaveLength(2);
    });

    it('finds status changes without a document or period, except for excluded people', async () => {
        const active = await world.personnel.create(person('Активний'));
        const excluded = await world.personnel.create(person('Виключений', { shpkNumber: 'excluded' }));
        await world.history.add(active.id, entry(1, { type: 'statusChange' }));
        await world.history.add(
            active.id,
            entry(2, { type: 'statusChange', period: { from: '2026-01-01', to: '2026-01-10' } }),
        );
        await world.history.add(excluded.id, entry(3, { type: 'statusChange' }));

        expect(await world.history.findIncomplete()).toEqual([
            { userId: active.id, entryId: 1, reason: 'missing_both' },
            { userId: active.id, entryId: 2, reason: 'missing_file' },
        ]);
    });

    it('refuses history and comments for a missing person', async () => {
        await expect(world.history.add(999, entry(1))).rejects.toMatchObject({ code: 'NOT_FOUND' });
        await expect(world.comments.add(999, entry(1))).rejects.toMatchObject({ code: 'NOT_FOUND' });
        expect(await world.comments.list(999)).toEqual([]);
    });

    it('removes a comment from everyone who has it', async () => {
        const a = await world.personnel.create(person('Перший'));
        const b = await world.personnel.create(person('Другий'));
        await world.comments.add(a.id, entry(7));
        await world.comments.add(b.id, entry(7));
        await world.comments.add(b.id, entry(8));

        await world.comments.remove(7);
        expect(await world.comments.list(a.id)).toEqual([]);
        expect((await world.comments.list(b.id)).map((c) => c.id)).toEqual([8]);
    });
});

describe('directives', () => {
    it('adds, lists and removes orders', async () => {
        const { id } = await world.personnel.create(person('Шевчук Микола'));
        await world.directives.add({
            userId: id,
            type: 'order',
            title: 'Наказ №1',
            file: { name: 'n1.pdf' },
            date: '2026-09-01',
            period: { from: '2026-09-01', to: '2026-09-10' },
        });
        await world.directives.add({ userId: id, type: 'exclude', title: 'Виключення', file: null, date: '2026-09-02' });

        const [order] = await world.directives.listByType('order');
        expect(order).toMatchObject({
            userId: id,
            title: 'Наказ №1',
            file: { name: 'n1.pdf' },
            period: { from: '2026-09-01', to: '2026-09-10' },
        });

        await world.directives.removeByUserAndDate(id, '2026-09-01');
        expect(await world.directives.listByType('order')).toEqual([]);
        await world.directives.clearByType('exclude');
        expect(await world.directives.listByType('exclude')).toEqual([]);

        const operations = (await journalOf('user_directives')).map((c) => c.operation);
        expect(operations).toEqual(['insert', 'insert', 'delete', 'delete']);
    });
});

describe('staffing', () => {
    it('imports new positions, skips existing numbers, updates and deletes', async () => {
        const first = await world.staffing.import([
            { shtat_number: '1', position_name: 'командир', extra_data: { row: 1 } },
            { shtat_number: '2', position_name: 'стрілець' },
        ]);
        expect(first).toEqual({ success: true, added: 2, skipped: 0, total: 2 });
        const second = await world.staffing.import([{ shtat_number: '2' }, { shtat_number: '3' }]);
        expect(second).toMatchObject({ added: 1, skipped: 1 });

        await world.staffing.update({ shtat_number: '1', position_name: 'командир взводу' });
        const [one] = await world.staffing.list();
        expect(one.position_name).toBe('командир взводу');
        expect(one.extra_data).toEqual({});

        await world.staffing.remove('1');
        await expect(world.staffing.remove('1')).rejects.toMatchObject({ code: 'NOT_FOUND' });
        await expect(world.staffing.update({ shtat_number: '1' })).rejects.toMatchObject({
            code: 'NOT_FOUND',
        });
        expect(await world.staffing.removeAll()).toBe(2);
        expect(await world.staffing.list()).toEqual([]);
    });
});

describe('named list', () => {
    const rows = [{ id: 1, fullName: 'Іваненко', attendance: ['', '', ''] }];

    it('creates a month once and edits single cells', async () => {
        await world.namedList.create('2026-09', rows);
        await expect(world.namedList.create('2026-09', rows)).rejects.toMatchObject({
            code: 'CONFLICT',
        });

        await world.namedList.updateCell('2026-09', 1, 2, '+');
        const [table] = await world.namedList.list();
        expect(table.data[0].attendance).toEqual(['', '', '+']);

        await expect(world.namedList.updateCell('2026-09', 1, 5, '+')).rejects.toMatchObject({
            code: 'VALIDATION',
        });
        await expect(world.namedList.updateCell('2026-09', 9, 0, '+')).rejects.toMatchObject({
            code: 'NOT_FOUND',
        });
        await expect(world.namedList.updateCell('2026-10', 1, 0, '+')).rejects.toMatchObject({
            code: 'NOT_FOUND',
        });

        await world.namedList.remove('2026-09');
        await expect(world.namedList.remove('2026-09')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
});

describe('report templates', () => {
    it('keeps a file while another record still uses it', async () => {
        const fileName = await world.templates.saveFile('../рапорт.docx', Buffer.from('docx'));
        expect(fileName).toBe('рапорт.docx');
        await world.templates.add('Рапорт 1', fileName);
        await world.templates.add('Рапорт 2', fileName);
        const [a, b] = await world.templates.list();

        await world.templates.remove(a.id);
        expect(Buffer.from(await world.templates.readFile(fileName)).toString()).toBe('docx');

        await world.templates.remove(b.id);
        await expect(world.templates.readFile(fileName)).rejects.toThrow();
        await expect(world.templates.remove(b.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
});

describe('change-log exchange', () => {
    it('refuses a short password and reports nothing to export', async () => {
        const pick = async () => path.join(root, 'never.pmc');
        expect(await world.exchange.exportChanges('short', pick)).toEqual({
            exported: 0,
            error: 'short-password',
        });
        expect(await world.exchange.exportChanges(PASSWORD, pick)).toEqual({ exported: 0 });
    });

    it('moves changes to another computer and matches records by uuid', async () => {
        const other = await createWorld(path.join(root, 'other'));
        try {
            // The other computer already has someone under local id 1.
            await other.personnel.create(person('Чужа людина'));

            const { id } = await world.personnel.create(person('Ткаченко Василь'));
            await world.personnel.update(id, { ...person('Ткаченко Василь'), rank: 'сержант' });
            await world.staffing.import([{ shtat_number: '7', position_name: 'кулеметник' }]);
            await world.namedList.create('2026-09', [{ id, attendance: ['', ''] }]);
            await world.namedList.updateCell('2026-09', id, 1, '+');

            const file = path.join(root, 'changes.pmc');
            expect((await world.exchange.exportChanges(PASSWORD, async () => file)).exported).toBe(5);
            // Exported entries leave the local journal.
            expect(await world.journal.pendingLocal()).toEqual([]);

            expect(await other.exchange.importChanges('wrong-password', async () => file)).toEqual({
                imported: 0,
                error: 'invalid-password',
            });
            const stats = await other.exchange.importChanges(PASSWORD, async () => file);
            expect(stats).toEqual({ imported: 5, skipped: 0, failed: 0 });

            const names = (await other.personnel.list()).map((u) => [u.fullName, u.rank]);
            expect(names).toEqual([
                ['Чужа людина', 'солдат'],
                ['Ткаченко Василь', 'сержант'],
            ]);
            expect((await other.staffing.list()).map((p) => p.position_name)).toEqual(['кулеметник']);
            expect((await other.namedList.list())[0].data[0].attendance).toEqual(['', '+']);
        } finally {
            await other.database.close();
        }
    });

    it('reports a canceled dialog', async () => {
        expect(await world.exchange.importChanges(PASSWORD, async () => null)).toEqual({
            imported: 0,
            canceled: true,
        });
    });
});
