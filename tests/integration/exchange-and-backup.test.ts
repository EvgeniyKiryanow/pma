import { app } from 'electron';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionManager } from '../../src/main/auth/SessionManager';
import { AwardTypeRepository } from '../../src/main/awards/AwardTypeRepository';
import { AwardTypeService } from '../../src/main/awards/AwardTypeService';
import { BackupService } from '../../src/main/backup/BackupService';
import { AppPaths } from '../../src/main/core/paths';
import { DatabaseManager } from '../../src/main/db/connection';
import { migrationRunner } from '../../src/main/db/migrations';
import { DEFAULT_DOCUMENT_CATEGORIES } from '../../src/main/db/migrations/014_exchange_identity';
import { DocumentRepository } from '../../src/main/documents/DocumentRepository';
import { DocumentService } from '../../src/main/documents/DocumentService';
import { JournalService } from '../../src/main/journal/JournalService';
import { EntryListStore } from '../../src/main/personnel/EntryListStore';
import { HistoryAttachments } from '../../src/main/personnel/HistoryAttachments';
import { HistoryService } from '../../src/main/personnel/HistoryService';
import { PersonnelRepository } from '../../src/main/personnel/PersonnelRepository';
import { PersonnelService } from '../../src/main/personnel/PersonnelService';
import { TemplateInstaller } from '../../src/main/reports/TemplateInstaller';
import { ChangeExchangeService } from '../../src/main/sync/ChangeExchangeService';
import { ChangeFiles } from '../../src/main/sync/ChangeFiles';
import { ChangeJournal } from '../../src/main/sync/ChangeJournal';
import { ChangeLogFile } from '../../src/main/sync/ChangeLogFile';
import type { JournalEntryInput } from '../../src/shared/types/journal';
import type { CommentOrHistoryEntry } from '../../src/shared/types/user';

/**
 * Everything added in 2.1–2.3 must move between computers: in a change log (.pmc, with the
 * files) and in a full backup. Two «computers» are two data folders with their own database.
 */

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
const PASSWORD = 'Obmin-Parol-2026';
const dataUrl = (text: string) => `data:text/plain;base64,${Buffer.from(text).toString('base64')}`;

type Computer = Awaited<ReturnType<typeof computer>>;

async function computer(dir: string, historyRoot = path.join(dir, 'history_files')) {
    await fsp.mkdir(dir, { recursive: true });
    const database = new DatabaseManager(() => path.join(dir, 'users.db'));
    await migrationRunner.run(await database.get());
    const db = () => database.get();
    const journal = new ChangeJournal(db);
    const people = new PersonnelRepository(db);
    const files = new HistoryAttachments(() => historyRoot, silentLogger);
    return {
        dir,
        database,
        db,
        files,
        personnel: new PersonnelService(database, people, journal, files),
        history: new HistoryService(
            database,
            new EntryListStore<CommentOrHistoryEntry>(people, journal, 'history'),
            files,
        ),
        documents: new DocumentService(database, new DocumentRepository(db), files, db, journal),
        journal: new JournalService(database, db, files, journal),
        awardTypes: new AwardTypeService(database, new AwardTypeRepository(db), journal),
        exchange: new ChangeExchangeService(
            database,
            journal,
            new ChangeLogFile(() => path.join(dir, '.staging')),
            silentLogger,
            new ChangeFiles(files, silentLogger),
        ),
    };
}

const note = (extra: Partial<JournalEntryInput> = {}): JournalEntryInput => ({
    title: 'Подати списки на ВЛК',
    body: 'До 12:00',
    dueDate: '2026-09-25',
    dueTime: '12:00',
    priority: 'high',
    category: 'Штаб',
    done: false,
    pinned: true,
    files: [],
    userId: null,
    ...extra,
});

/** A unit on one computer: a person with a document, an award with its scan, history, a note. */
async function fillUnit(c: Computer) {
    // An unrelated person first: the ids of the two computers differ.
    await c.personnel.create({ fullName: 'Лише на першому' });
    const person = await c.personnel.create({ fullName: 'Мельник Андрій', taxId: '3012345678' });
    const own = await c.awardTypes.save({
        name: 'Нагрудний знак «Сталева бригада»',
        kind: 'badge',
        awardedBy: 'Командир бригади',
        degrees: [],
        established: '',
        notes: '',
        retired: false,
    });
    await c.personnel.update(person.id, {
        ...person,
        awardRecords: [
            {
                id: 'award-1',
                awardId: `custom:${own.uuid}`,
                status: 'awarded',
                files: [{ name: 'наказ.txt', dataUrl: dataUrl('НАКАЗ-ПРО-НАГОРОДУ') }],
            },
        ],
    });
    await c.history.add(person.id, {
        id: 77,
        date: '2026-09-18T10:00:00.000Z',
        type: 'statusChange',
        description: 'Статус змінено з "В районі" → "Відпустка"',
        content: '',
        files: [
            { name: 'рапорт.txt', type: 'text/plain', dataUrl: dataUrl('РАПОРТ-НА-ВІДПУСТКУ') },
        ],
        status: 'Відпустка',
        previousStatus: 'В районі',
        period: { from: '2026-09-18', to: '2026-09-28' },
    } as CommentOrHistoryEntry);
    const category = await c.documents.addCategory('Довідки ВЛК');
    const [doc] = await c.documents.add({
        userId: person.id,
        categoryUuid: category.uuid,
        files: [{ name: 'довідка.txt', type: 'text/plain', dataUrl: dataUrl('ДОВІДКА-ВЛК') }],
    });
    const [passport] = await c.documents.add({
        userId: person.id,
        categoryUuid: DEFAULT_DOCUMENT_CATEGORIES[0].uuid,
        files: [{ name: 'паспорт.txt', dataUrl: dataUrl('ПАСПОРТ') }],
    });
    const entry = await c.journal.save(
        note({
            userId: person.id,
            files: [{ name: 'список.txt', dataUrl: dataUrl('СПИСОК-ВЛК') }],
        }),
    );
    return { person, own, category, doc, passport, entry };
}

let root: string;
let first: Computer;
let second: Computer;

beforeEach(async () => {
    root = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-exchange-'));
    first = await computer(path.join(root, 'first'));
    second = await computer(path.join(root, 'second'));
});

afterEach(async () => {
    await first.database.close().catch((): void => undefined);
    await second.database.close().catch((): void => undefined);
    await fsp.rm(root, { recursive: true, force: true }).catch((): void => undefined);
});

describe('change log between two computers', () => {
    it('carries people, own awards, documents with categories, journal and every file', async () => {
        const unit = await fillUnit(first);
        const file = path.join(root, 'flash', 'zmini.pmc');
        await fsp.mkdir(path.dirname(file), { recursive: true });
        const exported = await first.exchange.exportChanges(PASSWORD, async () => file);
        expect(exported.exported).toBeGreaterThan(5);
        // The file on the flash drive is encrypted.
        const raw = await fsp.readFile(file);
        for (const text of ['Мельник', 'ДОВІДКА-ВЛК', 'СПИСОК-ВЛК']) {
            expect(raw.includes(Buffer.from(text))).toBe(false);
        }

        // The second computer already has somebody else under the same local id.
        await second.personnel.create({ fullName: 'Інший на другому' });
        await second.personnel.create({ fullName: 'Ще один на другому' });
        const stats = await second.exchange.importChanges(PASSWORD, async () => file);
        expect(stats.failed).toBe(0);

        const conn = await second.db();
        const person = await conn.get<{ id: number }>(
            `SELECT id FROM users WHERE fullName = 'Мельник Андрій'`,
        );
        expect(person).toBeTruthy();
        expect(person!.id).not.toBe(unit.person.id);

        // Own award and its scan.
        expect((await second.awardTypes.list()).map((a) => a.uuid)).toEqual([unit.own.uuid]);
        expect(await second.files.readAwardFile(person!.id, 'award-1', 'наказ.txt')).toBe(
            dataUrl('НАКАЗ-ПРО-НАГОРОДУ'),
        );
        // History entry and its file.
        expect(await second.files.readAsDataUrl(person!.id, 77, 'рапорт.txt')).toBe(
            dataUrl('РАПОРТ-НА-ВІДПУСТКУ'),
        );
        const [change] = await second.history.recentStatusChanges();
        expect(change).toMatchObject({ userId: person!.id, to: 'Відпустка' });

        // Documents: the person of this computer, the categories merged, the files readable.
        const documents = await second.documents.list(person!.id);
        expect(documents.map((d) => [d.name, d.categoryUuid]).sort()).toEqual(
            [
                ['довідка.txt', unit.category.uuid],
                ['паспорт.txt', DEFAULT_DOCUMENT_CATEGORIES[0].uuid],
            ].sort(),
        );
        expect(await second.documents.load(unit.doc.uuid)).toBe(dataUrl('ДОВІДКА-ВЛК'));
        const categories = await second.documents.categories();
        expect(categories.filter((c) => c.name === 'Паспорт та ІПН')).toHaveLength(1);
        expect(categories.some((c) => c.uuid === unit.category.uuid)).toBe(true);

        // Journal entry: about the same person, with its file.
        const [entry] = await second.journal.list();
        expect(entry).toMatchObject({
            uuid: unit.entry.uuid,
            title: 'Подати списки на ВЛК',
            userId: person!.id,
            pinned: true,
            dueTime: '12:00',
        });
        expect(await second.journal.loadFile(entry.uuid, 'список.txt')).toBe(dataUrl('СПИСОК-ВЛК'));
    });

    it('carries later changes and deletions, and never duplicates a record', async () => {
        const unit = await fillUnit(first);
        const flash = path.join(root, 'flash');
        await fsp.mkdir(flash, { recursive: true });
        await first.exchange.exportChanges(PASSWORD, async () => path.join(flash, '1.pmc'));
        await second.exchange.importChanges(PASSWORD, async () => path.join(flash, '1.pmc'));

        // Changes on the first computer after the first exchange.
        await first.journal.setDone(unit.entry.uuid, true);
        await first.documents.update(unit.doc.uuid, {
            name: 'Довідка ВЛК.txt',
            categoryUuid: null,
        });
        await first.documents.remove(unit.passport.uuid);
        await first.documents.renameCategory(unit.category.uuid, 'ВЛК');
        const second2 = await first.journal.save(note({ title: 'Друге завдання', pinned: false }));
        await first.exchange.exportChanges(PASSWORD, async () => path.join(flash, '2.pmc'));
        const stats = await second.exchange.importChanges(PASSWORD, async () =>
            path.join(flash, '2.pmc'),
        );
        expect(stats.failed).toBe(0);

        const conn = await second.db();
        const person = await conn.get<{ id: number }>(
            `SELECT id FROM users WHERE fullName = 'Мельник Андрій'`,
        );
        const entries = await second.journal.list();
        expect(entries.map((e) => [e.title, e.done])).toEqual([
            ['Друге завдання', false],
            ['Подати списки на ВЛК', true],
        ]);
        expect(entries.find((e) => e.uuid === second2.uuid)).toBeTruthy();
        const documents = await second.documents.list(person!.id);
        expect(documents.map((d) => [d.name, d.categoryUuid])).toEqual([['Довідка ВЛК.txt', null]]);
        expect(fs.existsSync(second.files.documentDir(person!.id, unit.passport.uuid))).toBe(false);
        expect(
            (await second.documents.categories()).find((c) => c.uuid === unit.category.uuid)?.name,
        ).toBe('ВЛК');

        // Importing the same file again changes nothing and adds nothing.
        await second.exchange.importChanges(PASSWORD, async () => path.join(flash, '2.pmc'));
        expect(await second.journal.list()).toHaveLength(2);
        expect(await second.documents.list(person!.id)).toHaveLength(1);
    });

    it('journals every change of the new records', async () => {
        await fillUnit(first);
        const tables = (await new ChangeJournal(first.db).pendingLocal()).map((c) => c.table_name);
        for (const table of [
            'users',
            'award_types',
            'document_categories',
            'person_documents',
            'journal_entries',
        ]) {
            expect(tables).toContain(table);
        }
    });
});

describe('full backup', () => {
    it('brings back documents, categories, the journal, own awards and all their files', async () => {
        app.setPath('userData', path.join(root, 'userData'));
        await fsp.mkdir(AppPaths.userData, { recursive: true });
        const live = await computer(AppPaths.userData, AppPaths.historyFiles);
        await live.database.close();
        const database = new DatabaseManager();
        await migrationRunner.run(await database.get());
        const unitComputer = { ...(await computer(AppPaths.userData, AppPaths.historyFiles)) };
        await unitComputer.database.close();
        // One connection for the backup service and the services: the app's own.
        const db = () => database.get();
        const journal = new ChangeJournal(db);
        const people = new PersonnelRepository(db);
        const files = new HistoryAttachments(() => AppPaths.historyFiles, silentLogger);
        const c = {
            ...unitComputer,
            database,
            db,
            files,
            personnel: new PersonnelService(database, people, journal, files),
            history: new HistoryService(
                database,
                new EntryListStore<CommentOrHistoryEntry>(people, journal, 'history'),
                files,
            ),
            documents: new DocumentService(
                database,
                new DocumentRepository(db),
                files,
                db,
                journal,
            ),
            journal: new JournalService(database, db, files, journal),
            awardTypes: new AwardTypeService(database, new AwardTypeRepository(db), journal),
        } as Computer;
        const unit = await fillUnit(c);

        const backups = new BackupService({
            database,
            migrations: migrationRunner,
            sessions: new SessionManager(),
            templates: new TemplateInstaller(silentLogger),
            logger: silentLogger,
            appVersion: () => '0.0.0-test',
            instanceId: () => 'test-instance',
            clearBrowserData: vi.fn(async () => undefined),
        });
        const target = path.join(root, 'flash', 'unit.pmb');
        await fsp.mkdir(path.dirname(target), { recursive: true });
        await backups.exportPackage(target, PASSWORD);
        await backups.resetAll({ destroyLocalCopies: true });
        expect(await c.journal.list()).toEqual([]);

        await backups.selectImport(1, target);
        await backups.inspectImport(1, PASSWORD);
        await backups.restoreImport(1);

        expect((await c.journal.list()).map((e) => e.title)).toEqual(['Подати списки на ВЛК']);
        expect(await c.journal.loadFile(unit.entry.uuid, 'список.txt')).toBe(dataUrl('СПИСОК-ВЛК'));
        expect(await c.documents.load(unit.doc.uuid)).toBe(dataUrl('ДОВІДКА-ВЛК'));
        expect((await c.documents.categories()).some((cat) => cat.name === 'Довідки ВЛК')).toBe(
            true,
        );
        expect((await c.awardTypes.list())[0].uuid).toBe(unit.own.uuid);
        expect(await c.files.readAwardFile(unit.person.id, 'award-1', 'наказ.txt')).toBe(
            dataUrl('НАКАЗ-ПРО-НАГОРОДУ'),
        );
        await database.close();
    });
});
