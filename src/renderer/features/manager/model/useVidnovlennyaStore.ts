// stores/useVidnovlennyaStore.ts
import { create } from 'zustand';
import { FileWithDataUrl } from '../renderer/shared/components/FilePreviewModal';

export type VidnovlennyaEntry = {
    userId: number;
    title: string;
    description?: string;
    period: { from: string };
    file: FileWithDataUrl;
    date: string;
};

type VidnovlennyaState = {
    entries: VidnovlennyaEntry[];
    addVidnovlennya: (entry: VidnovlennyaEntry) => Promise<void>;
    fetchAll: () => Promise<void>;
};

export const useVidnovlennyaStore = create<VidnovlennyaState>((set, get) => ({
    entries: [],

    addVidnovlennya: async (entry) => {
        await window.electronAPI.directives.add({
            ...entry,
            type: 'restore',
        });
        set((state) => ({
            entries: [...state.entries, entry],
        }));
    },

    fetchAll: async () => {
        const raw = await window.electronAPI.directives.getAllByType('restore');

        const normalized: VidnovlennyaEntry[] = raw.map((item: any) => ({
            userId: item.userId,
            title: item.title,
            description: item.description || '',
            file: item.file,
            date: item.date,
            period: item.period || { from: '' },
        }));
        set({ entries: normalized });
    },
}));
``;
