/** Period selector of the history drawer. */
export type HistoryRange = '1d' | '7d' | '30d' | 'all';

/** Period selector of the history tab. Unknown values fall back to 30 days. */
export type HistoryFilter = '1day' | '7days' | '14days' | '30days' | 'all';

export type IncompleteHistoryReason = 'missing_file' | 'missing_period' | 'missing_both';

/** A status change without an attached document or period (the red badge in the header). */
export type IncompleteHistoryEntry = {
    userId: number;
    entryId: number;
    reason: IncompleteHistoryReason;
};

/** A status change of anyone (the desktop «Останні зміни статусів»). */
export type RecentStatusChange = {
    userId: number;
    entryId: number;
    /** When it was written (ISO). */
    date: string;
    from: string | null;
    to: string;
    period: { from: string; to?: string | null } | null;
    hasFiles: boolean;
};

/** A status change with a period (відпустка з … по …): what the named list marks by day. */
/** Calendar days "YYYY-MM-DD", both included. */
export type DayRange = { from: string; to: string };

export type StatusPeriodEntry = {
    userId: number;
    entryId: number;
    /** When the entry was written (ISO). */
    date: string;
    status: string;
    /** "YYYY-MM-DD" or "ДД.ММ.РРРР", as the history window stored it. */
    from: string;
    to: string | null;
};
