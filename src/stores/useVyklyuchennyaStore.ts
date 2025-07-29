import { create } from 'zustand';
import { FileWithDataUrl } from '../components/FilePreviewModal';

export type VyklyuchennyaEntry = {
    id: number;
    userId: number;
    title: string;
    description: string;
    periodFrom: string;
    file: FileWithDataUrl;
    date: string;
};

type VyklyuchennyaStore = {
    list: VyklyuchennyaEntry[];
    addVyklyuchennya: (entry: Omit<VyklyuchennyaEntry, 'id'>) => Promise<void>;
    fetchAll: () => Promise<void>;
};

export const useVyklyuchennyaStore = create<VyklyuchennyaStore>((set) => ({
    list: [],

    addVyklyuchennya: async (entry) => {
        await window.electronAPI.directives.add({
            ...entry,
            type: 'exclude',
        });
        // We skip `id` here because it's generated on backend
        set((state) => ({
            list: [...state.list, { ...entry, id: Date.now() }], // temporary id for UI only
        }));
    },

    fetchAll: async () => {
        const raw: any[] = await window.electronAPI.directives.getAllByType('exclude');

        const parsed: VyklyuchennyaEntry[] = raw.map((entry, idx) => ({
            id: entry.id ?? idx, // fallback if id is missing
            userId: entry.userId,
            title: entry.title,
            description: entry.description ?? '',
            periodFrom: entry.period?.from ?? '', // extract from `period` object
            file: entry.file,
            date: entry.date,
        }));

        set({ list: parsed });
    },
}));
