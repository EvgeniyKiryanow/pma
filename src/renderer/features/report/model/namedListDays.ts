import type { StatusPeriodEntry } from '../../../../shared/types/history';
import { StatusExcel } from '../../../shared/utils/excelUserStatuses';

/**
 * What the named list (табель вечірньої повірки) shows by day, apart from what was typed in:
 * the marks of status periods (відпустка з … по …) and the day an order or an exclusion
 * starts. Dates are calendar days of this computer — "2026-09-01" is the 1st everywhere,
 * never the 31st of August in Kyiv at midnight UTC.
 */

/** The mark of a status in the named list. */
export const STATUS_SHORT: Record<string, string> = {
    [StatusExcel.ABSENT_REHAB]: 'вп',
    [StatusExcel.ABSENT_REHAB_LEAVE]: 'вп',
    [StatusExcel.ABSENT_BUSINESS_TRIP]: 'вд',
    [StatusExcel.ABSENT_HOSPITALIZED]: 'гп',
    [StatusExcel.ABSENT_MEDICAL_COMPANY]: '+',
    [StatusExcel.ABSENT_WOUNDED]: '300',
    [StatusExcel.ABSENT_SZO]: 'сзч',
    [StatusExcel.ABSENT_KIA]: '200',
    [StatusExcel.ABSENT_MIA]: '500',
    [StatusExcel.ABSENT_VLK]: 'влк',
    [StatusExcel.MANAGEMENT]: 'воп',
    [StatusExcel.SUPPLY_COMBAT]: 'воп',
    [StatusExcel.SUPPLY_GENERAL]: 'воп',
    [StatusExcel.NON_COMBAT_NEWCOMERS]: '+',
    [StatusExcel.NON_COMBAT_LIMITED_FITNESS]: '+',
    [StatusExcel.NON_COMBAT_LIMITED_FITNESS_IN_COMBAT]: '+',
    [StatusExcel.HAVE_OFFER_TO_HOS]: '+',
    [StatusExcel.ABSENT_REHABED_ON]: 'зв',
    [StatusExcel.POSITIONS_INFANTRY]: 'воп',
    [StatusExcel.POSITIONS_UAV]: 'воп',
    [StatusExcel.POSITIONS_BRONEGROUP]: 'бч',
    [StatusExcel.POSITIONS_CREW]: 'воп',
    [StatusExcel.POSITIONS_CALCULATION]: 'воп',
    [StatusExcel.POSITIONS_RESERVE_INFANTRY]: 'воп',
    [StatusExcel.NO_STATUS]: '',
    [StatusExcel.NON_COMBAT_REFUSERS]: '',
};

export function statusCode(status: string | null | undefined): string {
    return (status && STATUS_SHORT[status]) || '';
}

/** A calendar day (local midnight) from "2026-09-01", "01.09.2026" or an ISO time stamp. */
export function localDate(value: string | null | undefined): Date | null {
    const text = String(value ?? '').trim();
    if (!text) return null;
    let y: number, m: number, d: number;
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
    const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);
    if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    else if (dotted) [d, m, y] = [Number(dotted[1]), Number(dotted[2]), Number(dotted[3])];
    else return null;
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
        ? date
        : null;
}

/** "YYYY-MM-DD" of a local calendar day. */
export function isoDay(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The days of a month as the range the status periods are asked for. */
export function monthRange(year: number, monthIndex: number): { from: string; to: string } {
    return {
        from: isoDay(new Date(year, monthIndex, 1)),
        to: isoDay(new Date(year, monthIndex + 1, 0)),
    };
}

export function formatDay(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

/**
 * The mark of each day of a month from the status periods of one person ('' — none). Where
 * periods overlap, the entry written last wins; a period without an end lasts one day.
 */
export function periodCodes(
    periods: StatusPeriodEntry[],
    year: number,
    monthIndex: number,
    days: number,
): string[] {
    const codes = Array<string>(days).fill('');
    const sorted = [...periods].sort(
        (a, b) => a.date.localeCompare(b.date) || a.entryId - b.entryId,
    );
    for (const period of sorted) {
        const code = statusCode(period.status);
        const from = localDate(period.from);
        if (!code || !from) continue;
        const to = localDate(period.to) ?? from;
        for (let i = 0; i < days; i++) {
            const day = new Date(year, monthIndex, i + 1);
            if (day >= from && day <= to) codes[i] = code;
        }
    }
    return codes;
}

export type RowClosure = {
    /** Index of the first day covered by the order / exclusion. */
    startIndex: number;
    /** What the merged cell says: «У розпорядженні з 01.09.2026 — підстава». */
    label: string;
};

/** The day an order or an exclusion starts in this month, with the text of the merged cell. */
export function rowClosure(
    kind: 'order' | 'excluded',
    from: string | null | undefined,
    description: string | null | undefined,
    year: number,
    monthIndex: number,
    days: number,
): RowClosure | null {
    const start = localDate(from);
    if (!start) return null;
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex, days);
    if (start > monthEnd) return null;
    const startIndex = start < monthStart ? 0 : start.getDate() - 1;
    const what = kind === 'order' ? 'У розпорядженні' : 'Виключений';
    const note = String(description ?? '').trim();
    return {
        startIndex,
        label: `${what} з ${formatDay(start)}${note ? ` — ${note}` : ''}`,
    };
}
