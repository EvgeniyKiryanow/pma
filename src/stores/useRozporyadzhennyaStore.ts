import { create } from 'zustand';
import { FileWithDataUrl } from '../components/FilePreviewModal';

export type RozporyadzhennyaEntry = {
    userId: number;
    title: string;
    description?: string;
    period: { from: string; to?: string };
    file: FileWithDataUrl;
    date: string;
};

type RozporyadzhennyaStore = {
    entries: RozporyadzhennyaEntry[];
    addEntry: (entry: RozporyadzhennyaEntry) => Promise<void>;
    fetchAll: () => Promise<void>;
    removeEntry: (userId: number, date: string) => void;
    getUserEntries: (userId: number) => RozporyadzhennyaEntry[];
};

export const useRozporyadzhennyaStore = create<RozporyadzhennyaStore>((set, get) => ({
    entries: [],

    addEntry: async (entry) => {
        await window.electronAPI.directives.add({
            ...entry,
            type: 'order',
        });
        set((state) => ({
            entries: [...state.entries, entry],
        }));
    },

    fetchAll: async () => {
        const rawData = await window.electronAPI.directives.getAllByType('order');

        const data: RozporyadzhennyaEntry[] = rawData.map((item: any) => ({
            userId: item.userId,
            title: item.title,
            description: item.description || '',
            file: item.file,
            date: item.date,
            period: item.period || { from: '', to: undefined },
        }));

        set({ entries: data });
    },

    removeEntry: (userId, date) =>
        set((state) => ({
            entries: state.entries.filter((e) => e.userId !== userId || e.date !== date),
        })),

    getUserEntries: (userId) => get().entries.filter((e) => e.userId === userId),
}));
