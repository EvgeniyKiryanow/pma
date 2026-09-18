/**
 * Statuses whose stored name was corrected. The database is migrated once (migration 008);
 * names that still arrive in the old spelling — an Excel file, a change file from a computer
 * that was not updated yet — are turned into the current one when they are written.
 */
export const RENAMED_STATUSES: Readonly<Record<string, string>> = {
    Бронєгрупа: 'Бронегрупа',
};

/** The current name of a status (other values pass through unchanged). */
export function currentStatusName<T>(status: T): T | string {
    return typeof status === 'string' && Object.hasOwn(RENAMED_STATUSES, status)
        ? RENAMED_STATUSES[status]
        : status;
}

/** Person columns that hold a status name. */
export const STATUS_COLUMNS = ['soldierStatus', 'previousStatus'] as const;
