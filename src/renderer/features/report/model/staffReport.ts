import { awardsSummary } from '../../../../shared/awards/catalog';
import classifyStatusForReport from '../../../../shared/helpers/classifyStatusForReport';
import type { LatestStatusPeriod } from '../../../../shared/types/history';
import type { User } from '../../../../shared/types/user';
import type { ShtatnaPosada } from '../../../entities/shtatna-posada/model/useShtatniStore';
import { localDate } from './namedListDays';

/**
 * «Штатний звіт»: one row per staff position with the person on it, and the filters of the
 * screen. The table, the print and the Excel export use the same rows and the same filter.
 */

export type StaffRow = {
    shtatNumber: string;
    unit: string;
    position: string;
    /** Category of the position in the БЧС (оф, с-т, с-д…). */
    category: string;
    rank: string;
    fullName: string;
    taxId: string;
    userId: number | null;
    /** The person's own status (empty for a vacant position). */
    soldierStatus: string;
    statusInArea: string;
    distanceFromLVZ: string;
    absenceReason: string;
    dateFrom: string;
    dateTo: string;
    statusNote: string;
    awards: string;
};

const positionNumber = (value: string) => parseInt(String(value).replace(/\D/g, ''), 10) || 0;

export function buildStaffRows(
    positions: ShtatnaPosada[],
    users: User[],
    periods: LatestStatusPeriod[],
): StaffRow[] {
    const byNumber = new Map<string, User>();
    for (const user of users) {
        const number = String(user.shpkNumber ?? '').trim();
        if (number && !byNumber.has(number)) byNumber.set(number, user);
    }
    const periodOf = new Map(periods.map((period) => [period.userId, period]));
    return [...positions]
        .sort((a, b) => positionNumber(a.shtat_number) - positionNumber(b.shtat_number))
        .map((position) => {
            const user = byNumber.get(String(position.shtat_number).trim());
            const extra = position.extra_data || {};
            const period = user ? periodOf.get(user.id) : undefined;
            const classified = classifyStatusForReport(user?.soldierStatus);
            return {
                shtatNumber: position.shtat_number,
                unit: position.unit_name || '',
                position: position.position_name || '',
                category: position.category || '',
                rank: user?.rank || '',
                fullName: user?.fullName || '',
                taxId: user?.taxId || '',
                userId: user?.id ?? null,
                soldierStatus: user?.soldierStatus || '',
                statusInArea: extra.statusInArea || classified.statusInArea,
                distanceFromLVZ: extra.distanceFromLVZ || '',
                absenceReason: extra.absenceReason || classified.absenceReason,
                dateFrom: period?.from || extra.dateFrom || '',
                dateTo: period?.to || extra.dateTo || '',
                statusNote: extra.statusNote || '',
                awards: awardsSummary(user?.awardRecords),
            };
        });
}

// ---------------------------------------------------------------- filter

export type Occupancy = 'all' | 'filled' | 'vacant';
export type Presence = 'all' | 'present' | 'absent' | 'unknown';

export type StaffFilter = {
    /** Words to find anywhere in the row (ПІБ, ІПН, № посади, посада…). */
    query: string;
    units: string[];
    positions: string[];
    ranks: string[];
    categories: string[];
    /** Statuses of the people; `VACANT` stands for a position without a person. */
    statuses: string[];
    occupancy: Occupancy;
    presence: Presence;
    /** Only rows with a note in «помилка статусів». */
    withNote: boolean;
    withAwards: boolean;
    /** People without ІПН or без звання: what still has to be filled in. */
    incomplete: boolean;
    /** The status period touches these days ("YYYY-MM-DD"; either may be empty). */
    periodFrom: string;
    periodTo: string;
};

export const VACANT = '__vacant__';
export const NO_VALUE = '__none__';

export const EMPTY_STAFF_FILTER: StaffFilter = {
    query: '',
    units: [],
    positions: [],
    ranks: [],
    categories: [],
    statuses: [],
    occupancy: 'all',
    presence: 'all',
    withNote: false,
    withAwards: false,
    incomplete: false,
    periodFrom: '',
    periodTo: '',
};

/** How many conditions the filter has (0 — everything is shown). */
export function activeFilterCount(filter: StaffFilter): number {
    return (
        (filter.query.trim() ? 1 : 0) +
        (filter.units.length ? 1 : 0) +
        (filter.positions.length ? 1 : 0) +
        (filter.ranks.length ? 1 : 0) +
        (filter.categories.length ? 1 : 0) +
        (filter.statuses.length ? 1 : 0) +
        (filter.occupancy !== 'all' ? 1 : 0) +
        (filter.presence !== 'all' ? 1 : 0) +
        (filter.withNote ? 1 : 0) +
        (filter.withAwards ? 1 : 0) +
        (filter.incomplete ? 1 : 0) +
        (filter.periodFrom || filter.periodTo ? 1 : 0)
    );
}

const norm = (value: string) =>
    value
        .toLowerCase()
        .replace(/[ʼ’‘`]/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

/** The value a row has for a list filter; empty values are one choice of their own. */
export const valueOf = {
    units: (row: StaffRow) => row.unit.trim() || NO_VALUE,
    positions: (row: StaffRow) => row.position.trim() || NO_VALUE,
    ranks: (row: StaffRow) => (row.userId === null ? VACANT : row.rank.trim() || NO_VALUE),
    categories: (row: StaffRow) => row.category.trim() || NO_VALUE,
    statuses: (row: StaffRow) =>
        row.userId === null ? VACANT : row.soldierStatus.trim() || NO_VALUE,
};

export type ListFilterKey = keyof typeof valueOf;

const presenceOf = (row: StaffRow): Exclude<Presence, 'all'> =>
    row.statusInArea.trim() ? 'present' : row.absenceReason.trim() ? 'absent' : 'unknown';

/** Does the status period of the row touch the chosen days? Rows without a period do not. */
function touchesPeriod(row: StaffRow, from: string, to: string): boolean {
    const start = localDate(row.dateFrom);
    if (!start) return false;
    const end = localDate(row.dateTo) ?? start;
    const since = localDate(from);
    const until = localDate(to);
    return (!since || end >= since) && (!until || start <= until);
}

function matches(row: StaffRow, filter: StaffFilter, skip?: ListFilterKey): boolean {
    const words = norm(filter.query).split(' ').filter(Boolean);
    if (words.length) {
        const text = norm(Object.values(row).join(' '));
        if (!words.every((word) => text.includes(word))) return false;
    }
    for (const key of Object.keys(valueOf) as ListFilterKey[]) {
        if (key === skip || !filter[key].length) continue;
        if (!filter[key].includes(valueOf[key](row))) return false;
    }
    return matchesState(row, filter);
}

/** The switches of the filter: occupied or vacant, present or absent, notes, awards, period. */
function matchesState(row: StaffRow, filter: StaffFilter): boolean {
    const vacant = row.userId === null;
    if (filter.occupancy !== 'all' && vacant !== (filter.occupancy === 'vacant')) return false;
    if (filter.presence !== 'all' && (vacant || presenceOf(row) !== filter.presence)) return false;
    if (filter.withNote && !row.statusNote.trim()) return false;
    if (filter.withAwards && !row.awards.trim()) return false;
    if (filter.incomplete && (vacant || (row.taxId.trim() && row.rank.trim()))) return false;
    const period = filter.periodFrom || filter.periodTo;
    return !period || touchesPeriod(row, filter.periodFrom, filter.periodTo);
}

export function filterStaffRows(rows: StaffRow[], filter: StaffFilter): StaffRow[] {
    return activeFilterCount(filter) ? rows.filter((row) => matches(row, filter)) : rows;
}

/**
 * The choices of a list filter with how many rows each would show — counted with every other
 * condition of the filter applied, so a choice that leads to nothing shows 0.
 */
export function facetOf(
    rows: StaffRow[],
    filter: StaffFilter,
    key: ListFilterKey,
): { value: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(valueOf[key](row), 0);
    for (const row of rows) {
        if (!matches(row, filter, key)) continue;
        const value = valueOf[key](row);
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const special = (value: string) => (value === VACANT ? 2 : value === NO_VALUE ? 1 : 0);
    return [...counts]
        .map(([value, count]) => ({ value, count }))
        .sort(
            (a, b) =>
                special(a.value) - special(b.value) ||
                (key === 'units' || key === 'positions' ? 0 : a.value.localeCompare(b.value, 'uk')),
        );
}

// ---------------------------------------------------------------- sort

export type StaffSortKey = keyof Pick<
    StaffRow,
    | 'shtatNumber'
    | 'unit'
    | 'position'
    | 'rank'
    | 'fullName'
    | 'taxId'
    | 'statusInArea'
    | 'absenceReason'
    | 'dateFrom'
    | 'dateTo'
    | 'statusNote'
    | 'awards'
    | 'distanceFromLVZ'
>;
export type StaffSort = { key: StaffSortKey; direction: 'asc' | 'desc' } | null;

/** Sorted by a column; empty cells always last. `null` keeps the order of the БЧС. */
export function sortStaffRows(rows: StaffRow[], sort: StaffSort): StaffRow[] {
    if (!sort) return rows;
    const sign = sort.direction === 'asc' ? 1 : -1;
    const value = (row: StaffRow) => String(row[sort.key] ?? '').trim();
    const compare = (a: StaffRow, b: StaffRow) => {
        const x = value(a);
        const y = value(b);
        if (!x || !y) return x ? -1 : y ? 1 : 0;
        if (sort.key === 'shtatNumber') return sign * (positionNumber(x) - positionNumber(y));
        if (sort.key === 'dateFrom' || sort.key === 'dateTo') {
            const dx = localDate(x)?.getTime() ?? 0;
            const dy = localDate(y)?.getTime() ?? 0;
            return sign * (dx - dy);
        }
        return sign * x.localeCompare(y, 'uk', { numeric: true });
    };
    return [...rows].sort(compare);
}
