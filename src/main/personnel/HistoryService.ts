import { AppError } from '../../shared/ipc/result';
import type {
    HistoryFilter,
    HistoryRange,
    IncompleteHistoryEntry,
} from '../../shared/types/history';
import type { CommentOrHistoryEntry } from '../../shared/types/user';
import type { Transactor } from '../db/types';
import type { EntryListStore } from './EntryListStore';
import { attachmentMeta, type HistoryAttachments } from './HistoryAttachments';

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

/** Excluded people and people under an order do not need status documents. */
function isExemptFromDocuments(shpkNumber: string | null): boolean {
    const shpk = String(shpkNumber ?? '');
    return shpk === 'excluded' || shpk.includes('order');
}

/** History of a person: status changes, orders, moves — with attachments on disk. */
export class HistoryService {
    constructor(
        private readonly transactor: Transactor,
        private readonly history: EntryListStore<CommentOrHistoryEntry>,
        private readonly attachments: HistoryAttachments,
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

    /** Throws NOT_FOUND when the person does not exist. */
    async add(userId: number, entry: CommentOrHistoryEntry): Promise<void> {
        if ((await this.history.read(userId)) === null) {
            throw new AppError('NOT_FOUND', 'User not found');
        }
        const files = entry.files || [];
        await this.attachments.save(userId, entry.id, files);

        await this.transactor.transaction(async () => {
            const entries = await this.requireEntries(userId);
            entries.push({ ...entry, files: attachmentMeta(files) });
            await this.history.write(userId, entries);
        });
    }

    /** Replaces an entry; attachments that were removed from it are deleted. Throws NOT_FOUND. */
    async edit(userId: number, entry: CommentOrHistoryEntry): Promise<void> {
        const entries = await this.requireEntries(userId);
        const current = entries.find((item) => item.id === entry.id);
        if (!current) throw new AppError('NOT_FOUND', 'History entry not found');

        const files = entry.files || [];
        await this.attachments.removeOthers(userId, entry.id, current.files || [], files);
        await this.attachments.save(userId, entry.id, files);

        await this.transactor.transaction(async () => {
            const latest = await this.requireEntries(userId);
            const index = latest.findIndex((item) => item.id === entry.id);
            if (index === -1) return;
            latest[index] = { ...entry, files: attachmentMeta(files) };
            await this.history.write(userId, latest);
        });
    }

    /** Deletes the entry wherever it is; returns the person it belonged to. Throws NOT_FOUND. */
    async remove(entryId: number): Promise<number> {
        const owner = (await this.history.all()).find(({ entries }) =>
            entries.some((entry) => entry.id === entryId),
        );
        if (!owner) throw new AppError('NOT_FOUND', 'History entry not found in any user');

        await this.transactor.transaction(async () => {
            const entries = await this.requireEntries(owner.userId);
            await this.history.write(
                owner.userId,
                entries.filter((entry) => entry.id !== entryId),
            );
        });
        await this.attachments.removeEntry(owner.userId, entryId);
        return owner.userId;
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
        const result: IncompleteHistoryEntry[] = [];
        for (const { userId, shpkNumber, entries } of await this.history.all()) {
            if (isExemptFromDocuments(shpkNumber)) continue;
            for (const entry of entries) {
                if (entry?.type !== 'statusChange') continue;
                const noFiles = !entry.files || entry.files.length === 0;
                const noPeriod = !entry.period;
                if (!noFiles && !noPeriod) continue;
                result.push({
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
        return result;
    }

    private async requireEntries(userId: number): Promise<CommentOrHistoryEntry[]> {
        const entries = await this.history.read(userId);
        if (entries === null) throw new AppError('NOT_FOUND', 'User not found');
        return entries;
    }
}
