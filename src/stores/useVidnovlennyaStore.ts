// stores/useVidnovlennyaStore.ts
import { create } from 'zustand';
import { FileWithDataUrl } from '../components/FilePreviewModal';

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
    addVidnovlennya: (entry: VidnovlennyaEntry) => void;
};

export const useVidnovlennyaStore = create<VidnovlennyaState>((set) => ({
    entries: [],
    addVidnovlennya: (entry) =>
        set((state) => ({
            entries: [...state.entries, entry],
        })),
}));
