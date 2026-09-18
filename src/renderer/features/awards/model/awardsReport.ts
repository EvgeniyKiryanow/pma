import { create } from 'zustand';

import {
    type AwardGroupId,
    awardTitle,
    compareAwards,
    findAward,
    isGranted,
} from '../../../../shared/awards/catalog';
import type { AwardRecord, AwardStatus, User } from '../../../../shared/types/user';

/** The «Нагороди» table: every award record of every person, with the person's post. */

export type AwardStatusFilter = AwardStatus | 'all' | 'granted' | 'pending';

export type AwardFilters = {
    status: AwardStatusFilter;
    group: AwardGroupId | 'all';
    query: string;
};

export type AwardRow = {
    key: string;
    user: User;
    record: AwardRecord;
    title: string;
    group: AwardGroupId;
};

/** Filters of the table on the screen (the Excel file takes the same rows). */
export const useAwardFilters = create<
    AwardFilters & { set: (patch: Partial<AwardFilters>) => void }
>((set) => ({
    status: 'all',
    group: 'all',
    query: '',
    set: (patch) => set(patch),
}));

function statusMatches(record: AwardRecord, status: AwardStatusFilter): boolean {
    if (status === 'all') return true;
    if (status === 'granted') return isGranted(record);
    if (status === 'pending') return record.status === 'draft' || record.status === 'submitted';
    return record.status === status;
}

export function awardRows(users: User[], filters: AwardFilters): AwardRow[] {
    const words = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
    const rows: AwardRow[] = [];
    const people = [...users].sort((a, b) =>
        String(a.fullName ?? '').localeCompare(String(b.fullName ?? ''), 'uk'),
    );
    for (const user of people) {
        const records = [...(Array.isArray(user.awardRecords) ? user.awardRecords : [])].sort(
            compareAwards,
        );
        for (const record of records) {
            const group = findAward(record.awardId)?.group ?? 'other';
            if (filters.group !== 'all' && group !== filters.group) continue;
            if (!statusMatches(record, filters.status)) continue;
            const title = awardTitle(record);
            const haystack = [
                user.fullName,
                user.rank,
                user.position,
                title,
                record.awardedBy,
                record.orderNumber,
            ]
                .join(' ')
                .toLowerCase();
            if (!words.every((word) => haystack.includes(word))) continue;
            rows.push({ key: `${user.id}-${record.id}`, user, record, title, group });
        }
    }
    return rows;
}

export function awardTotals(rows: AwardRow[]) {
    return {
        people: new Set(rows.map((row) => row.user.id)).size,
        records: rows.length,
        granted: rows.filter((row) => isGranted(row.record)).length,
        pending: rows.filter(
            (row) => row.record.status === 'draft' || row.record.status === 'submitted',
        ).length,
    };
}
