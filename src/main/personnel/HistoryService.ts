import fs from 'fs';

import { statusOfEntry } from '../../shared/helpers/statusHistory';
import { AppError } from '../../shared/ipc/result';
import type {
    HistoryFilter,
    HistoryRange,
    IncompleteHistoryEntry,
    RecentStatusChange,
    StatusPeriodEntry,
} from '../../shared/types/history';
import type { CommentOrHistoryEntry } from '../../shared/types/user';
import type { Transactor } from '../db/types';
import type { EntryListStore } from './EntryListStore';
import type { HistoryAttachments } from './HistoryAttachments';
import type { HistoryIndexRepository, HistoryIndexRow } from './HistoryIndexRepository';

const FILTER_DAYS: Record<HistoryFilter, number> = {
    '1day': 1,
    '7days': 7,
    '14days': 14,
    '30days': 30,
    all: 100 * 365,
};

const RANGE_DAYS: Record<Exclude<HistoryRange, 'all'>, number> = { '1d': 1, '7d': 7, '30d': 30 };

function newerThanDays(entries: CommentOrHistoryEntry[], days: number): CommentOrHistoryEntry[] {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    return entries.filter((entry) => new Date(entry.date) >= threshold);
}

/** What `statusOfEntry` reads, from an index row. */
const text = (value: unknown) =>
    value === null || value === undefined ? undefined : String(value);
const entryText = (row: HistoryIndexRow) => ({
    status: text(row.status),
    description: text(row.description),
    content: text(row.content),
});

/** History of a person: status changes, orders, moves — with attachments on disk. */
export class HistoryService {
    constructor(
        private readonly transactor: Transactor,
        private readonly history: EntryListStore<CommentOrHistoryEntry>,
        private readonly attachments: HistoryAttachments,
        private readonly index: HistoryIndexRepository,
    ) {}

    /** Entries of the last N days; unknown filters mean 30 days. */
    async list(userId: number, filter: string): Promise<CommentOrHistoryEntry[]> {
        const days = FILTER_DAYS[filter as HistoryFilter] ?? 30;
        return newerThanDays((await this.history.read(userId)) ?? [], days);
    }

    async listByRange(userId: number, range: HistoryRange): Promise<CommentOrHistoryEntry[]> {
        const entries = (await this.history.read(userId)) ?? [];
        if (range === 'all') return entries;
        return newerThanDays(entries, RANGE_DAYS[range] ?? 30);
    }

    /**
     * Adds an entry with its attachments. The files are written first; if the entry cannot be
     * saved they are removed again, so neither exists without the other. Throws NOT_FOUND
     * when the person does not exist.
     */
    async add(userId: number, entry: CommentOrHistoryEntry): Promise<void> {
        if ((await this.history.read(userId)) === null) {
            throw new AppError('NOT_FOUND', 'User not found');
        }
        const dirExisted = fs.existsSync(this.attachments.entryDir(userId, entry.id));
        try {
            const files = await this.attachments.save(userId, entry.id, entry.files || []);
            await this.transactor.transaction(async () => {
                const entries = await this.requireEntries(userId);
                entries.push({ ...entry, files });
                await this.history.write(userId, entries);
            });
        } catch (err) {
            if (!dirExisted) await this.attachments.removeEntry(userId, entry.id);
            throw err;
        }
    }

    /**
     * Replaces an entry; attachments that were removed from it are deleted once the new
     * version is saved. Throws NOT_FOUND.
     */
    async edit(userId: number, entry: CommentOrHistoryEntry): Promise<void> {
        const entries = await this.requireEntries(userId);
        const current = entries.find((item) => item.id === entry.id);
        if (!current) throw new AppError('NOT_FOUND', 'History entry not found');
        const before = current.files || [];

        const files = await this.attachments.save(userId, entry.id, entry.files || []);
        try {
            await this.transactor.transaction(async () => {
                const latest = await this.requireEntries(userId);
                const index = latest.findIndex((item) => item.id === entry.id);
                if (index === -1) throw new AppError('NOT_FOUND', 'History entry not found');
                latest[index] = { ...entry, files };
                await this.history.write(userId, latest);
            });
        } catch (err) {
            // Keep what the saved entry still points to; drop only files new in this attempt.
            await this.attachments.removeOthers(userId, entry.id, files, before);
            throw err;
        }
        await this.attachments.removeOthers(userId, entry.id, before, files);
    }

    /** Deletes the entry wherever it is; returns the person it belonged to. Throws NOT_FOUND. */
    async remove(entryId: number): Promise<number> {
        const owner = await this.index.ownerOf(entryId);
        if (owner === null) throw new AppError('NOT_FOUND', 'History entry not found in any user');

        await this.transactor.transaction(async () => {
            const entries = await this.requireEntries(owner);
            await this.history.write(
                owner,
                entries.filter((entry) => entry.id !== entryId),
            );
        });
        await this.attachments.removeEntry(owner, entryId);
        return owner;
    }

    async loadFile(
        userId: number,
        entryId: number,
        fileName: string,
    ): Promise<{ dataUrl: string }> {
        try {
            return { dataUrl: await this.attachments.readAsDataUrl(userId, entryId, fileName) };
        } catch {
            throw new Error(`Файл не знайдено: ${fileName}`);
        }
    }

    /** Status changes without an attached document or period (the red badge in the header). */
    async findIncomplete(): Promise<IncompleteHistoryEntry[]> {
        return (await this.index.incompleteStatusChanges()).map((row) => ({
            userId: row.userId,
            entryId: row.entryId,
            reason:
                row.fileCount === 0 && !row.hasPeriod
                    ? 'missing_both'
                    : row.fileCount === 0
                      ? 'missing_file'
                      : 'missing_period',
        }));
    }

    /**
     * Every status change with a period, of everyone (the named list marks them by day).
     * With `range` ("YYYY-MM-DD") only the periods that may touch those days: a month of the
     * named list, the fortnight of the desktop.
     */
    async statusPeriods(range?: { from: string; to: string }): Promise<StatusPeriodEntry[]> {
        const result: StatusPeriodEntry[] = [];
        for (const row of await this.index.statusPeriods(range)) {
            const status = statusOfEntry(entryText(row));
            if (!status) continue;
            result.push({
                userId: row.userId,
                entryId: row.entryId,
                date: row.date as string,
                status,
                from: row.periodFrom as string,
                to: row.periodTo || null,
            });
        }
        return result;
    }

    /** The latest status changes of everyone, newest first. */
    async recentStatusChanges(limit = 40): Promise<RecentStatusChange[]> {
        const result: RecentStatusChange[] = [];
        const page = Math.max(limit * 2, 50);
        for (let offset = 0; result.length < limit; offset += page) {
            const rows = await this.index.statusChangesNewestFirst(page, offset);
            for (const row of rows) {
                const to = statusOfEntry(entryText(row));
                if (!to) continue;
                const previous =
                    text(row.previousStatus)?.trim() ||
                    /з\s*"([^"]+)"\s*→/.exec(`${row.description ?? ''}`)?.[1] ||
                    null;
                result.push({
                    userId: row.userId,
                    entryId: row.entryId,
                    date: row.date as string,
                    from: previous && previous !== '—' ? previous : null,
                    to,
                    period: row.periodFrom
                        ? { from: row.periodFrom, to: row.periodTo ?? undefined }
                        : null,
                    hasFiles: row.fileCount > 0,
                });
                if (result.length === limit) break;
            }
            if (rows.length < page) break;
        }
        return result;
    }

    private async requireEntries(userId: number): Promise<CommentOrHistoryEntry[]> {
        const entries = await this.history.read(userId);
        if (entries === null) throw new AppError('NOT_FOUND', 'User not found');
        return entries;
    }
}
