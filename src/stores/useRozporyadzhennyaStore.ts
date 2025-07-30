import { create } from 'zustand';
import { FileWithDataUrl } from '../components/FilePreviewModal';
import { useUserStore } from './userStore';

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
    addEntry: (entry: RozporyadzhennyaEntry) => Promise<void>;
    fetchAll: () => Promise<void>;
    removeEntry: (userId: number, date: string) => Promise<void>;
    clearAllEntries: () => Promise<void>;
    getUserEntries: (userId: number) => RozporyadzhennyaEntry[];
};

export const useRozporyadzhennyaStore = create<RozporyadzhennyaStore>((set, get) => ({
    entries: [],
    addEntry: async (entry) => {
        await window.electronAPI.directives.add({
            userId: entry.userId,
            type: 'order',
            title: entry.title,
            description: entry.description,
            file: entry.file,
            date: entry.date,
            period: entry.period,
        });

        set((state) => ({
            entries: [...state.entries, entry],
        }));
    },

    fetchAll: async () => {
        const raw = await window.electronAPI.directives.getAllByType('order');

        const parsed: RozporyadzhennyaEntry[] = raw.map((entry: any) => ({
            id: entry.id,
            userId: entry.userId,
            title: entry.title,
            description: entry.description ?? '',
            file: entry.file,
            date: entry.date,
            period: entry.period || { from: '', to: undefined },
        }));

        set({ entries: parsed });
    },

    removeEntry: async (userId, date) => {
        await window.electronAPI.directives.delete({ userId, date });

        set((state) => ({
            entries: state.entries.filter((e) => e.userId !== userId || e.date !== date),
        }));

        // also reset shpkNumber
        const { updateUser, users } = useUserStore.getState();
        const user = users.find((u) => u.id === userId);
        if (user) {
            updateUser({ ...user, shpkNumber: null });
        }
    },

    clearAllEntries: async () => {
        const current = get().entries;

        // Remove from DB
        for (const entry of current) {
            await window.electronAPI.directives.delete({ userId: entry.userId, date: entry.date });
        }

        // Reset shpkNumber for all affected users
        const { updateUser, users } = useUserStore.getState();
        for (const entry of current) {
            const user = users.find((u) => u.id === entry.userId);
            if (user) {
                updateUser({ ...user, shpkNumber: null });
            }
        }

        set({ entries: [] });
    },

    getUserEntries: (userId) => get().entries.filter((e) => e.userId === userId),
}));
