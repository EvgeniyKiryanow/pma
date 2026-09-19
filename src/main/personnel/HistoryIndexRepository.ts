import type { DbProvider } from '../db/types';

/** One history entry as `history_index` keeps it (see migration 15). */
export type HistoryIndexRow = {
    userId: number;
    entryId: number;
    type: string | null;
    date: string | null;
    status: string | null;
    previousStatus: string | null;
    description: string | null;
    content: string | null;
    hasPeriod: number;
    periodFrom: string | null;
    periodTo: string | null;
    fileCount: number;
};

const COLUMNS = `h.user_id AS userId, h.entry_id AS entryId, h.type, h.date, h.status,
    h.previous_status AS previousStatus, h.description, h.content, h.has_period AS hasPeriod,
    h.period_from AS periodFrom, h.period_to AS periodTo, h.file_count AS fileCount`;

/** Excluded people and people under an order need no status documents. */
const NOT_EXEMPT = `COALESCE(u.shpkNumber, '') <> 'excluded'
    AND instr(COALESCE(u.shpkNumber, ''), 'order') = 0`;

/**
 * Summaries of everyone's history from `history_index` — indexed queries instead of parsing
 * every person's JSON. The index follows `users.history` through triggers.
 */
export class HistoryIndexRepository {
    constructor(private readonly db: DbProvider) {}

    /** Person holding the entry with this id (the first one, as the JSON scan found it). */
    async ownerOf(entryId: number): Promise<number | null> {
        const row = await (
            await this.db()
        ).get<{ userId: number }>(
            `SELECT user_id AS userId FROM history_index WHERE entry_id = ? ORDER BY user_id LIMIT 1`,
            entryId,
        );
        return row?.userId ?? null;
    }

    /** Status changes of people who need documents, lacking files or a period. */
    async incompleteStatusChanges(): Promise<HistoryIndexRow[]> {
        return (await this.db()).all<HistoryIndexRow[]>(
            `SELECT ${COLUMNS} FROM history_index h INDEXED BY ix_history_index_incomplete
             JOIN users u ON u.id = h.user_id
             WHERE h.type = 'statusChange' AND (h.file_count = 0 OR h.has_period = 0)
               AND ${NOT_EXEMPT}
             ORDER BY h.user_id, h.pos`,
        );
    }

    /**
     * Status changes with a period start. With `range` ("YYYY-MM-DD" bounds) only the periods
     * that may touch it — a superset: bounds in another format are left to the caller.
     */
    async statusPeriods(range?: { from: string; to: string }): Promise<HistoryIndexRow[]> {
        const where = range
            ? `AND (h.to_day IS NULL OR h.to_day >= ?) AND (h.from_day IS NULL OR h.from_day <= ?)`
            : '';
        return (await this.db()).all<HistoryIndexRow[]>(
            `SELECT ${COLUMNS} FROM history_index h
             WHERE h.type = 'statusChange' AND h.period_from IS NOT NULL AND h.period_from <> ''
             ${where}
             ORDER BY h.user_id, h.pos`,
            ...(range ? [range.from, range.to] : []),
        );
    }

    /** The period of the last status change (in the order of the history) of each person. */
    async latestPeriods(): Promise<
        { userId: number; periodFrom: string; periodTo: string | null }[]
    > {
        return (await this.db()).all(
            `SELECT h.user_id AS userId, h.period_from AS periodFrom, h.period_to AS periodTo
             FROM history_index h
             WHERE h.type = 'statusChange' AND h.period_from IS NOT NULL AND h.period_from <> ''
               AND h.pos = (
                   SELECT MAX(x.pos) FROM history_index x
                   WHERE x.user_id = h.user_id AND x.type = 'statusChange'
                     AND x.period_from IS NOT NULL AND x.period_from <> ''
               )`,
        );
    }

    /** Status changes, newest first, a page at a time. */
    async statusChangesNewestFirst(limit: number, offset: number): Promise<HistoryIndexRow[]> {
        return (await this.db()).all<HistoryIndexRow[]>(
            `SELECT ${COLUMNS} FROM history_index h
             WHERE h.type = 'statusChange'
             ORDER BY h.date DESC, h.user_id, h.pos
             LIMIT ? OFFSET ?`,
            limit,
            offset,
        );
    }
}
