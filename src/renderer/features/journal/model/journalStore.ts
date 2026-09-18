import { create } from 'zustand';

import type { JournalEntry, JournalEntryInput } from '../../../../shared/types/journal';
import { journalApi } from '../../../shared/api/documents';
import { localDate } from '../../report/model/namedListDays';

/** The working journal, loaded once and kept in step with every change. */
type JournalState = {
    entries: JournalEntry[];
    loaded: boolean;
    load: () => Promise<void>;
    save: (input: JournalEntryInput) => Promise<JournalEntry>;
    setDone: (uuid: string, done: boolean) => Promise<void>;
    setPinned: (uuid: string, pinned: boolean) => Promise<void>;
    remove: (uuid: string) => Promise<void>;
};

const replace = (entries: JournalEntry[], entry: JournalEntry) => [
    entry,
    ...entries.filter((e) => e.uuid !== entry.uuid),
];

export const useJournalStore = create<JournalState>((set, get) => ({
    entries: [],
    loaded: false,
    load: async () => set({ entries: await journalApi.list(), loaded: true }),
    save: async (input) => {
        const saved = await journalApi.save(input);
        set({ entries: replace(get().entries, saved) });
        return saved;
    },
    setDone: async (uuid, done) => {
        set({ entries: replace(get().entries, await journalApi.setDone(uuid, done)) });
    },
    setPinned: async (uuid, pinned) => {
        set({ entries: replace(get().entries, await journalApi.setPinned(uuid, pinned)) });
    },
    remove: async (uuid) => {
        await journalApi.remove(uuid);
        set({ entries: get().entries.filter((e) => e.uuid !== uuid) });
    },
}));

// ------------------------------------------------------------------------ grouping

export type JournalBucket =
    | 'pinned'
    | 'overdue'
    | 'today'
    | 'tomorrow'
    | 'week'
    | 'later'
    | 'undated'
    | 'done';

export const JOURNAL_BUCKETS: readonly JournalBucket[] = [
    'pinned',
    'overdue',
    'today',
    'tomorrow',
    'week',
    'later',
    'undated',
    'done',
];

export type JournalView = 'active' | 'today' | 'week' | 'overdue' | 'pinned' | 'done' | 'all';

export type JournalFilters = {
    view: JournalView;
    query: string;
    category: string;
};

const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function bucketOf(entry: JournalEntry, today = new Date()): JournalBucket {
    if (entry.done) return 'done';
    if (entry.pinned) return 'pinned';
    const due = localDate(entry.dueDate);
    if (!due) return 'undated';
    const diff = Math.round((day(due) - day(today)) / 86_400_000);
    if (diff < 0) return 'overdue';
    if (diff === 0) return 'today';
    if (diff === 1) return 'tomorrow';
    if (diff <= 7) return 'week';
    return 'later';
}

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 } as const;

function matches(
    entry: JournalEntry,
    filters: JournalFilters,
    bucket: JournalBucket,
    today: Date,
): boolean {
    const view = filters.view;
    if (view === 'active' && bucket === 'done') return false;
    if (view === 'done' && bucket !== 'done') return false;
    if (view === 'pinned' && !(entry.pinned && !entry.done)) return false;
    if (view === 'overdue' && bucket !== 'overdue') return false;
    if (
        view === 'today' &&
        !['overdue', 'today'].includes(bucketOf({ ...entry, pinned: false }, today))
    )
        return false;
    if (
        view === 'week' &&
        !['overdue', 'today', 'tomorrow', 'week'].includes(
            bucketOf({ ...entry, pinned: false }, today),
        )
    )
        return false;
    if (filters.category && entry.category !== filters.category) return false;
    const words = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
    const text = [entry.title, entry.body, entry.category, ...entry.files.map((f) => f.name)]
        .join(' ')
        .toLowerCase();
    return words.every((word) => text.includes(word));
}

/** The journal as it is shown: buckets in their order, each sorted by date and priority. */
export function groupJournal(
    entries: JournalEntry[],
    filters: JournalFilters,
    today = new Date(),
): { bucket: JournalBucket; entries: JournalEntry[] }[] {
    const groups = new Map<JournalBucket, JournalEntry[]>();
    for (const entry of entries) {
        const bucket = bucketOf(entry, today);
        if (!matches(entry, filters, bucket, today)) continue;
        groups.set(bucket, [...(groups.get(bucket) ?? []), entry]);
    }
    return JOURNAL_BUCKETS.filter((bucket) => groups.get(bucket)?.length).map((bucket) => ({
        bucket,
        entries: groups
            .get(bucket)!
            .sort((a, b) =>
                bucket === 'done'
                    ? String(b.doneAt ?? '').localeCompare(String(a.doneAt ?? ''))
                    : String(a.dueDate ?? '9999').localeCompare(String(b.dueDate ?? '9999')) ||
                      String(a.dueTime ?? '99').localeCompare(String(b.dueTime ?? '99')) ||
                      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
                      b.createdAt.localeCompare(a.createdAt),
            ),
    }));
}

export function journalCounts(entries: JournalEntry[], today = new Date()) {
    const counts = {
        active: 0,
        overdue: 0,
        today: 0,
        week: 0,
        pinned: 0,
        done: 0,
        all: entries.length,
    };
    for (const entry of entries) {
        const bucket = bucketOf({ ...entry, pinned: false }, today);
        if (entry.done) {
            counts.done++;
            continue;
        }
        counts.active++;
        if (entry.pinned) counts.pinned++;
        if (bucket === 'overdue') counts.overdue++;
        if (bucket === 'overdue' || bucket === 'today') counts.today++;
        if (['overdue', 'today', 'tomorrow', 'week'].includes(bucket)) counts.week++;
    }
    return counts;
}

/** Categories used so far, most used first (suggestions of the editor and filter chips). */
export function journalCategories(entries: JournalEntry[]): string[] {
    const counts = new Map<string, number>();
    for (const entry of entries) {
        if (entry.category) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

/** A local "YYYY-MM-DD" for date inputs. */
export function isoDay(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
