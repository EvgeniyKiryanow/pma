import crypto from 'crypto';

import { AppError } from '../../shared/ipc/result';
import {
    JOURNAL_PRIORITIES,
    type JournalEntry,
    type JournalEntryInput,
    type JournalFile,
    type JournalPriority,
} from '../../shared/types/journal';
import type { DbProvider, Transactor } from '../db/types';
import type { HistoryAttachments } from '../personnel/HistoryAttachments';

type Row = {
    uuid: string;
    title: string;
    body: string;
    due_date: string | null;
    due_time: string | null;
    priority: string;
    category: string;
    done: number;
    done_at: string | null;
    pinned: number;
    files: string;
    user_id: number | null;
    created_at: string;
    updated_at: string;
};

type FileStore = Pick<
    HistoryAttachments,
    'journalDir' | 'saveToDir' | 'readFromDir' | 'keepOnly' | 'removeDir'
>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

function parseFiles(value: string): JournalFile[] {
    try {
        const list = JSON.parse(value || '[]');
        return Array.isArray(list) ? list.filter((f) => f && typeof f.name === 'string') : [];
    } catch {
        return [];
    }
}

const toEntry = (row: Row): JournalEntry => ({
    uuid: row.uuid,
    title: row.title,
    body: row.body ?? '',
    dueDate: row.due_date || null,
    dueTime: row.due_time || null,
    priority: (JOURNAL_PRIORITIES as readonly string[]).includes(row.priority)
        ? (row.priority as JournalPriority)
        : 'normal',
    category: row.category ?? '',
    done: Boolean(row.done),
    doneAt: row.done_at,
    pinned: Boolean(row.pinned),
    files: parseFiles(row.files),
    userId: row.user_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

function clean(input: JournalEntryInput) {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title || title.length > 300)
        throw new AppError('VALIDATION', undefined, { field: 'title' });
    const dueDate = input.dueDate || null;
    if (dueDate && !DATE.test(dueDate))
        throw new AppError('VALIDATION', undefined, { field: 'dueDate' });
    const dueTime = dueDate && input.dueTime ? input.dueTime : null;
    if (dueTime && !TIME.test(dueTime))
        throw new AppError('VALIDATION', undefined, { field: 'dueTime' });
    if (!(JOURNAL_PRIORITIES as readonly string[]).includes(input.priority)) {
        throw new AppError('VALIDATION', undefined, { field: 'priority' });
    }
    const files = Array.isArray(input.files) ? input.files : [];
    if (files.length > 50) throw new AppError('VALIDATION', undefined, { field: 'files' });
    return {
        title,
        body: String(input.body ?? '').slice(0, 20000),
        dueDate,
        dueTime,
        priority: input.priority,
        category: String(input.category ?? '')
            .trim()
            .slice(0, 80),
        done: Boolean(input.done),
        pinned: Boolean(input.pinned),
        files,
        userId: Number.isInteger(input.userId) ? input.userId : null,
    };
}

/**
 * The working journal: notes and tasks with a date, priority, category, pin and files
 * (<data>/history_files/journal/<uuid>/). Local to this computer, carried by full backups.
 */
export class JournalService {
    constructor(
        private readonly transactor: Transactor,
        private readonly db: DbProvider,
        private readonly files: FileStore,
    ) {}

    async list(): Promise<JournalEntry[]> {
        const rows = await (
            await this.db()
        ).all<Row[]>(
            'SELECT * FROM journal_entries ORDER BY done ASC, pinned DESC, due_date IS NULL, due_date, created_at DESC',
        );
        return rows.map(toEntry);
    }

    private async byUuid(uuid: string): Promise<Row | undefined> {
        return (await this.db()).get<Row>('SELECT * FROM journal_entries WHERE uuid = ?', uuid);
    }

    /** Adds (no uuid) or replaces an entry; new files are written, removed ones deleted. */
    async save(input: JournalEntryInput): Promise<JournalEntry> {
        const values = clean(input);
        const current = input.uuid ? await this.byUuid(input.uuid) : undefined;
        if (input.uuid && !current) throw new AppError('NOT_FOUND');
        const uuid = current?.uuid ?? crypto.randomUUID();
        const dir = this.files.journalDir(uuid);
        const stored = values.files.length
            ? await this.files.saveToDir(dir, values.files, `journal ${uuid}`)
            : [];
        const conn = await this.db();
        await this.transactor.transaction(async () => {
            const doneAt = values.done
                ? current?.done
                    ? current.done_at
                    : new Date().toISOString()
                : null;
            if (current) {
                await conn.run(
                    `UPDATE journal_entries SET title = ?, body = ?, due_date = ?, due_time = ?,
                        priority = ?, category = ?, done = ?, done_at = ?, pinned = ?, files = ?,
                        user_id = ? WHERE uuid = ?`,
                    values.title,
                    values.body,
                    values.dueDate,
                    values.dueTime,
                    values.priority,
                    values.category,
                    values.done ? 1 : 0,
                    doneAt,
                    values.pinned ? 1 : 0,
                    JSON.stringify(stored),
                    values.userId,
                    uuid,
                );
            } else {
                await conn.run(
                    `INSERT INTO journal_entries (uuid, title, body, due_date, due_time, priority,
                        category, done, done_at, pinned, files, user_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    uuid,
                    values.title,
                    values.body,
                    values.dueDate,
                    values.dueTime,
                    values.priority,
                    values.category,
                    values.done ? 1 : 0,
                    doneAt,
                    values.pinned ? 1 : 0,
                    JSON.stringify(stored),
                    values.userId,
                );
            }
        });
        await this.files.keepOnly(dir, stored);
        return toEntry((await this.byUuid(uuid))!);
    }

    /** Ticks an entry done or open again (the checkbox in the lists). */
    async setDone(uuid: string, done: boolean): Promise<JournalEntry> {
        const row = await this.byUuid(uuid);
        if (!row) throw new AppError('NOT_FOUND');
        await (
            await this.db()
        ).run(
            'UPDATE journal_entries SET done = ?, done_at = ? WHERE uuid = ?',
            done ? 1 : 0,
            done ? new Date().toISOString() : null,
            uuid,
        );
        return toEntry((await this.byUuid(uuid))!);
    }

    async setPinned(uuid: string, pinned: boolean): Promise<JournalEntry> {
        const row = await this.byUuid(uuid);
        if (!row) throw new AppError('NOT_FOUND');
        await (
            await this.db()
        ).run('UPDATE journal_entries SET pinned = ? WHERE uuid = ?', pinned ? 1 : 0, uuid);
        return toEntry((await this.byUuid(uuid))!);
    }

    async remove(uuid: string): Promise<void> {
        if (!(await this.byUuid(uuid))) throw new AppError('NOT_FOUND');
        await (await this.db()).run('DELETE FROM journal_entries WHERE uuid = ?', uuid);
        await this.files.removeDir(this.files.journalDir(uuid));
    }

    async loadFile(uuid: string, fileName: string): Promise<string> {
        if (!(await this.byUuid(uuid))) throw new AppError('NOT_FOUND');
        return this.files.readFromDir(this.files.journalDir(uuid), fileName);
    }
}
