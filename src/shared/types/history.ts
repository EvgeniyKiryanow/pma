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
