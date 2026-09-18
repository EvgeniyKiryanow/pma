import { create } from 'zustand';

import { directivesApi } from '../../../shared/api/directives';
import type { FileWithDataUrl } from '../../../shared/components/FilePreviewModal';

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
    /** Throws ApiError; the screen that called it shows it. */
    addVidnovlennya: (entry: VidnovlennyaEntry) => Promise<void>;
    fetchAll: () => Promise<void>;
};

/** Restorations (відновлення) of excluded people. */
export const useVidnovlennyaStore = create<VidnovlennyaState>((set) => ({
    entries: [],

    addVidnovlennya: async (entry) => {
        await directivesApi.add({ ...entry, type: 'restore' });
        set((state) => ({ entries: [...state.entries, entry] }));
    },

    fetchAll: async () => {
        const records = await directivesApi.list('restore');
        set({
            entries: records.map((record) => ({
                userId: record.userId,
                title: record.title,
                description: record.description || '',
                file: record.file,
                date: record.date,
                period: record.period || { from: '' },
            })),
        });
    },
}));
