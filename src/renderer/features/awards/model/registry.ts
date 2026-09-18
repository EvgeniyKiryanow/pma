import {
    allAwards,
    AWARD_GROUPS,
    type AwardDef,
    type AwardGroupId,
    compareAwards,
    isGranted,
} from '../../../../shared/awards/catalog';
import type { AwardRecord, User } from '../../../../shared/types/user';

/** How many people hold an award, and how many are on the way to it. */
export type AwardCount = { granted: number; pending: number; people: number };

export type AwardHolder = { user: User; record: AwardRecord };

const normalize = (text: string) =>
    text
        .toLowerCase()
        .replace(/[«»"'’ʼ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const recordsOf = (user: User): AwardRecord[] =>
    Array.isArray(user.awardRecords) ? user.awardRecords : [];

/** Counts per award id over everyone's cards. */
export function countAwards(users: User[]): Map<string, AwardCount> {
    const counts = new Map<string, AwardCount & { ids: Set<number> }>();
    for (const user of users) {
        for (const record of recordsOf(user)) {
            const count = counts.get(record.awardId) ?? {
                granted: 0,
                pending: 0,
                people: 0,
                ids: new Set<number>(),
            };
            if (isGranted(record)) count.granted++;
            else if (record.status === 'draft' || record.status === 'submitted') count.pending++;
            count.ids.add(user.id);
            count.people = count.ids.size;
            counts.set(record.awardId, count);
        }
    }
    return counts;
}

/** Everyone who has a record of the award, most advanced first, then by name. */
export function holdersOf(users: User[], awardId: string): AwardHolder[] {
    const rank = (record: AwardRecord) =>
        ['presented', 'awarded', 'submitted', 'draft', 'rejected'].indexOf(record.status);
    return users
        .flatMap((user) =>
            recordsOf(user)
                .filter((record) => record.awardId === awardId)
                .map((record) => ({ user, record })),
        )
        .sort(
            (a, b) =>
                rank(a.record) - rank(b.record) ||
                compareAwards(a.record, b.record) ||
                String(a.user.fullName ?? '').localeCompare(String(b.user.fullName ?? ''), 'uk'),
        );
}

export type RegistryFilters = {
    query: string;
    group: AwardGroupId | 'all';
    /** Only awards somebody holds or is submitted for. */
    onlyHeld: boolean;
};

export type RegistryGroup = { id: AwardGroupId; awards: AwardDef[] };

/** The register as it is shown: groups in their order, filtered by the search words. */
export function registryGroups(
    filters: RegistryFilters,
    counts: Map<string, AwardCount>,
): RegistryGroup[] {
    const words = normalize(filters.query).split(' ').filter(Boolean);
    const awards = allAwards().filter((award) => award.id !== 'other');
    return AWARD_GROUPS.map((group) => ({
        id: group.id,
        awards: awards.filter((award) => {
            if (award.group !== group.id) return false;
            if (filters.group !== 'all' && filters.group !== group.id) return false;
            if (filters.onlyHeld && !counts.get(award.id)) return false;
            const text = normalize(
                [award.name, award.body, award.awardedBy, award.established, award.notes]
                    .filter(Boolean)
                    .join(' '),
            );
            return words.every((word) => text.includes(word));
        }),
    })).filter(
        (group) =>
            group.awards.length > 0 ||
            // The own awards stay visible while empty: that is where they are added.
            (group.id === 'unit' &&
                !words.length &&
                !filters.onlyHeld &&
                (filters.group === 'all' || filters.group === 'unit')),
    );
}
