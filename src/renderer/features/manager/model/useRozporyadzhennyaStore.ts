import { create } from 'zustand';

import type { DirectiveRecord } from '../../../../shared/types/directive';
import { directivesApi } from '../../../shared/api/directives';
import { FileWithDataUrl } from '../../../shared/components/FilePreviewModal';
import { useUserStore } from '../../../stores/userStore';

export type RozporyadzhennyaEntry = {
    userId: number;
    title: string;
    description?: string;
    period: { from: string; to?: string };
    file: FileWithDataUrl;
    date: string;
    id?: number;
};

type RozporyadzhennyaStore = {
    entries: RozporyadzhennyaEntry[];
    /** Mutations throw ApiError; the screen that called them shows it. */
    addEntry: (entry: RozporyadzhennyaEntry) => Promise<void>;
    fetchAll: () => Promise<void>;
    removeEntry: (userId: number, date: string) => Promise<void>;
    clearAllEntries: () => Promise<void>;
    getUserEntries: (userId: number) => RozporyadzhennyaEntry[];
};

function toEntry(record: DirectiveRecord): RozporyadzhennyaEntry {
    return {
        id: record.id,
        userId: record.userId,
        title: record.title,
        description: record.description ?? '',
        file: record.file,
        date: record.date,
        period: record.period || { from: '', to: undefined },
    };
}

/** A person under an order leaves the staff position; removing the order returns them. */
async function releaseFromOrder(userId: number): Promise<void> {
    const { updateUser, users } = useUserStore.getState();
    const user = users.find((u) => u.id === userId);
    if (user) await updateUser({ ...user, shpkNumber: null });
}

/** Orders (розпорядження). */
export const useRozporyadzhennyaStore = create<RozporyadzhennyaStore>((set, get) => ({
    entries: [],

    addEntry: async (entry) => {
        await directivesApi.add({
            userId: entry.userId,
            type: 'order',
            title: entry.title,
            description: entry.description,
            file: entry.file,
            date: entry.date,
            period: entry.period,
        });
        set((state) => ({ entries: [...state.entries, entry] }));
    },

    fetchAll: async () => {
        set({ entries: (await directivesApi.list('order')).map(toEntry) });
    },

    removeEntry: async (userId, date) => {
        await directivesApi.removeByUserAndDate(userId, date);
        set((state) => ({
            entries: state.entries.filter((e) => e.userId !== userId || e.date !== date),
        }));
        await releaseFromOrder(userId);
    },

    clearAllEntries: async () => {
        const current = get().entries;
        for (const entry of current) {
            await directivesApi.removeByUserAndDate(entry.userId, entry.date);
        }
        set({ entries: [] });
        for (const entry of current) await releaseFromOrder(entry.userId);
    },

    getUserEntries: (userId) => get().entries.filter((e) => e.userId === userId),
}));
