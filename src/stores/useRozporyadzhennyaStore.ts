// stores/useRozporyadzhennyaStore.ts
import { create } from 'zustand';
import { FileWithDataUrl } from '../components/FilePreviewModal';

export type RozporyadzhennyaEntry = {
    userId: number;
    title: string;
    description?: string;
    period: { from: string };
    file: FileWithDataUrl;
    date: string;
};

type RozporyadzhennyaStore = {
    entries: RozporyadzhennyaEntry[];
    addEntry: (entry: RozporyadzhennyaEntry) => void;
    removeEntry: (userId: number, date: string) => void;
    getUserEntries: (userId: number) => RozporyadzhennyaEntry[];
};

export const useRozporyadzhennyaStore = create<RozporyadzhennyaStore>((set, get) => ({
    entries: [],

    addEntry: (entry) =>
        set((state) => ({
            entries: [...state.entries, entry],
        })),

    removeEntry: (userId, date) =>
        set((state) => ({
            entries: state.entries.filter((e) => e.userId !== userId || e.date !== date),
        })),

    getUserEntries: (userId) => get().entries.filter((e) => e.userId === userId),
}));
