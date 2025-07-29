// stores/useVyklyuchennyaStore.ts
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
    addVyklyuchennya: (entry: VyklyuchennyaEntry) => void;
};

export const useVyklyuchennyaStore = create<VyklyuchennyaStore>((set) => ({
    list: [],
    addVyklyuchennya: (entry) =>
        set((state) => ({
            list: [...state.list, entry],
        })),
}));
