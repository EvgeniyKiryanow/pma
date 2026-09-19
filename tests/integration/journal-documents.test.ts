import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DatabaseManager } from '../../src/main/db/connection';
import { migrationRunner } from '../../src/main/db/migrations';
import { DocumentRepository } from '../../src/main/documents/DocumentRepository';
import { DocumentService } from '../../src/main/documents/DocumentService';
import { JournalService } from '../../src/main/journal/JournalService';
import { EntryListStore } from '../../src/main/personnel/EntryListStore';
import { HistoryAttachments } from '../../src/main/personnel/HistoryAttachments';
import { HistoryIndexRepository } from '../../src/main/personnel/HistoryIndexRepository';
import { HistoryService } from '../../src/main/personnel/HistoryService';
import { PersonnelRepository } from '../../src/main/personnel/PersonnelRepository';
import { PersonnelService } from '../../src/main/personnel/PersonnelService';
import { ChangeJournal } from '../../src/main/sync/ChangeJournal';
import type { JournalEntryInput } from '../../src/shared/types/journal';
import type { CommentOrHistoryEntry } from '../../src/shared/types/user';

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
const dataUrl = (text: string) => `data:text/plain;base64,${Buffer.from(text).toString('base64')}`;

let dir: string;
let database: DatabaseManager;
let files: HistoryAttachments;
let documents: DocumentService;
let journal: JournalService;
let personnel: PersonnelService;
let history: HistoryService;

beforeEach(async () => {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-journal-'));
    database = new DatabaseManager(() => path.join(dir, 'users.db'));
    await migrationRunner.run(await database.get());
    const db = () => database.get();
    const changes = new ChangeJournal(db);
    const people = new PersonnelRepository(db);
    files = new HistoryAttachments(() => path.join(dir, 'history_files'), silentLogger);
    documents = new DocumentService(database, new DocumentRepository(db), files, db);
    journal = new JournalService(database, db, files);
    personnel = new PersonnelService(database, people, changes, files);
    history = new HistoryService(
        database,
        new EntryListStore<CommentOrHistoryEntry>(people, changes, 'history'),
        files, new HistoryIndexRepository(db));
});

afterEach(async () => {
    await database.close().catch((): void => undefined);
    await fsp.rm(dir, { recursive: true, force: true }).catch((): void => undefined);
});

const entry = (extra: Partial<JournalEntryInput> = {}): JournalEntryInput => ({
    title: 'Подати списки на ВЛК',
    body: '',
    dueDate: '2026-09-25',
    dueTime: null,
    priority: 'high',
    category: 'Штаб',
    done: false,
    pinned: false,
    files: [],
    userId: null,
    ...extra,
});

describe('documents of a person', () => {
    it('keeps categories, files in them, and refuses to drop a category in use', async () => {
        const categories = await documents.categories();
        expect(categories.map((c) => c.name)).toContain('Військовий квиток');
        const custom = await documents.addCategory('Довідки');
        await expect(documents.addCategory('довідки')).rejects.toMatchObject({ code: 'CONFLICT' });

        const { id } = await personnel.create({ fullName: 'Мельник Андрій' });
        const [doc] = await documents.add({
            userId: id,
            categoryUuid: custom.uuid,
            files: [{ name: 'довідка.txt', type: 'text/plain', dataUrl: dataUrl('зміст') }],
        });
        expect(doc).toMatchObject({ name: 'довідка.txt', categoryUuid: custom.uuid, size: 10 });
        expect(await documents.load(doc.uuid)).toBe(dataUrl('зміст'));
        const counted = (await documents.categories(id)).find((c) => c.uuid === custom.uuid);
        expect(counted?.count).toBe(1);

        await expect(documents.removeCategory(custom.uuid)).rejects.toMatchObject({
            code: 'CONFLICT',
            details: { count: 1 },
        });
        const moved = await documents.update(doc.uuid, { categoryUuid: null, name: 'Довідка ВЛК' });
        expect(moved).toMatchObject({ categoryUuid: null, name: 'Довідка ВЛК' });
        await documents.removeCategory(custom.uuid);

        const recent = await documents.recent();
        expect(recent[0]).toMatchObject({ source: 'document', userName: 'Мельник Андрій' });

        // Deleting the person takes the rows and the files.
        await personnel.remove(id);
        expect(await documents.list(id)).toEqual([]);
        expect(fs.existsSync(files.documentDir(id, doc.uuid))).toBe(false);
    });

    it('lists files of the history among the recent ones', async () => {
        const { id } = await personnel.create({ fullName: 'Коваль Ігор' });
        await history.add(id, {
            id: 1,
            date: '2026-09-18T10:00:00.000Z',
            type: 'statusChange',
            description: 'Статус змінено з "В районі" → "Відпустка"',
            content: '',
            files: [{ name: 'рапорт.pdf', type: 'application/pdf', dataUrl: dataUrl('pdf') }],
            status: 'Відпустка',
            previousStatus: 'В районі',
            period: { from: '2026-09-18', to: '2026-09-28' },
        } as CommentOrHistoryEntry);
        await history.add(id, {
            id: 2,
            date: '2026-09-10T10:00:00.000Z',
            type: 'history',
            description: 'Старший запис',
            content: '',
            files: [{ name: 'старий.pdf', type: 'application/pdf', dataUrl: dataUrl('old') }],
        } as CommentOrHistoryEntry);
        const recent = await documents.recent();
        const fromHistory = recent.filter((f) => f.source === 'history');
        expect(fromHistory.map((f) => f.name)).toEqual(['рапорт.pdf', 'старий.pdf']);
        expect(fromHistory[0]).toMatchObject({
            name: 'рапорт.pdf',
            userId: id,
            userName: 'Коваль Ігор',
            context: 'Статус змінено з "В районі" → "Відпустка"',
            ref: { entryId: 1 },
        });
        expect(await documents.recent(1)).toHaveLength(1);
        const [change] = await history.recentStatusChanges();
        expect(change).toMatchObject({
            userId: id,
            from: 'В районі',
            to: 'Відпустка',
            hasFiles: true,
            period: { from: '2026-09-18', to: '2026-09-28' },
        });
    });
});

describe('the journal', () => {
    it('saves entries with files, ticks them done and removes them with their files', async () => {
        const saved = await journal.save(
            entry({ files: [{ name: 'список.txt', dataUrl: dataUrl('1. Іваненко') }] }),
        );
        expect(saved).toMatchObject({
            title: 'Подати списки на ВЛК',
            priority: 'high',
            done: false,
        });
        expect(saved.files).toEqual([{ name: 'список.txt', size: 19 }]);
        expect(await journal.loadFile(saved.uuid, 'список.txt')).toBe(dataUrl('1. Іваненко'));

        const done = await journal.setDone(saved.uuid, true);
        expect(done.done).toBe(true);
        expect(done.doneAt).toBeTruthy();

        // Removing the file from the entry deletes it from disk.
        const changed = await journal.save({ ...entry(), uuid: saved.uuid, files: [] });
        expect(changed.files).toEqual([]);
        expect(fs.existsSync(files.journalDir(saved.uuid))).toBe(false);

        await expect(journal.save(entry({ title: '  ' }))).rejects.toMatchObject({
            code: 'VALIDATION',
        });
        await expect(journal.save(entry({ dueDate: '25.09.2026' }))).rejects.toMatchObject({
            code: 'VALIDATION',
        });
        await journal.remove(saved.uuid);
        expect(await journal.list()).toEqual([]);
    });

    it('takes over the old reminders', async () => {
        const other = path.join(dir, 'old');
        await fsp.mkdir(other);
        const old = new DatabaseManager(() => path.join(other, 'users.db'));
        const conn = await old.get();
        const earlier = migrationRunner.constructor as unknown as new (
            m: unknown[],
        ) => typeof migrationRunner;
        const { MIGRATIONS } = await import('../../src/main/db/migrations');
        await new earlier(MIGRATIONS.filter((m) => m.version < 13)).run(conn);
        await conn.run(`INSERT INTO todos (content, completed) VALUES ('Здати звіт', 0)`);
        await conn.run(`INSERT INTO todos (content, completed) VALUES ('Отримати форму', 1)`);
        await migrationRunner.run(conn);
        const moved = await new JournalService(old, () => old.get(), files).list();
        expect(moved.map((e) => [e.title, e.done])).toEqual([
            ['Здати звіт', false],
            ['Отримати форму', true],
        ]);
        await old.close();
    });
});

describe('update from 2.3', () => {
    it('gives the default categories the same uuid everywhere and people uuids to the rows', async () => {
        const other = path.join(dir, 'v13');
        await fsp.mkdir(other);
        const old = new DatabaseManager(() => path.join(other, 'users.db'));
        const conn = await old.get();
        const Runner = migrationRunner.constructor as unknown as new (
            m: unknown[],
        ) => typeof migrationRunner;
        const { MIGRATIONS } = await import('../../src/main/db/migrations');
        const { DEFAULT_DOCUMENT_CATEGORIES } = await import(
            '../../src/main/db/migrations/014_exchange_identity'
        );
        await new Runner(MIGRATIONS.filter((m) => m.version < 14)).run(conn);
        await conn.run(`INSERT INTO users (fullName) VALUES ('Бондар Олег')`);
        const passport = await conn.get(
            `SELECT uuid FROM document_categories WHERE name = 'Паспорт та ІПН'`,
        );
        await conn.run(
            `INSERT INTO person_documents (user_id, category_uuid, name, file_name) VALUES (1, ?, 'п.pdf', 'п.pdf')`,
            passport.uuid,
        );
        await conn.run(`INSERT INTO journal_entries (title, user_id) VALUES ('Про Бондаря', 1)`);

        await migrationRunner.run(conn);
        const person = await conn.get(`SELECT uuid FROM users WHERE id = 1`);
        expect(await conn.get(`SELECT category_uuid, user_uuid FROM person_documents`)).toEqual({
            category_uuid: DEFAULT_DOCUMENT_CATEGORIES[0].uuid,
            user_uuid: person.uuid,
        });
        expect((await conn.get(`SELECT user_uuid FROM journal_entries`)).user_uuid).toBe(
            person.uuid,
        );
        const uuids = await conn.all(`SELECT uuid FROM document_categories ORDER BY sort`);
        expect(uuids.map((c: { uuid: string }) => c.uuid)).toEqual(
            DEFAULT_DOCUMENT_CATEGORIES.map((c) => c.uuid),
        );
        // A new row gets the person's uuid by itself.
        await conn.run(`INSERT INTO journal_entries (title, user_id) VALUES ('Ще', 1)`);
        expect(
            (await conn.get(`SELECT user_uuid FROM journal_entries WHERE title = 'Ще'`)).user_uuid,
        ).toBe(person.uuid);
        await old.close();
    });
});
