import { create } from 'zustand';

import { FileWithDataUrl } from '../../../shared/components/FilePreviewModal';
import { useUserStore } from '../../../stores/userStore';

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
    removeVyklyuchennya: (id: number) => Promise<void>;
    clearAllVyklyuchennya: () => Promise<void>;
};

export const useVyklyuchennyaStore = create<VyklyuchennyaStore>((set, get) => ({
    list: [],

    addVyklyuchennya: async (entry) => {
        await window.electronAPI.directives.add({
            ...entry,
            type: 'exclude',
            period: {
                from: entry.periodFrom,
                to: entry.periodFrom,
            },
        });

        // Refresh list after adding
        await get().fetchAll();
    },

    fetchAll: async () => {
        const raw = await window.electronAPI.directives.getAllByType('exclude');

        const parsed: VyklyuchennyaEntry[] = raw.map((entry) => ({
            id: entry.id,
            userId: entry.userId,
            title: entry.title,
            description: entry.description ?? '',
            periodFrom: entry.period?.from ?? '',
            file: entry.file,
            date: entry.date,
        }));

        set({ list: parsed });
    },

    removeVyklyuchennya: async (id) => {
        const entry = get().list.find((e) => e.id === id);
        if (entry) {
            // Delete the user via userStore
            const user = useUserStore.getState().users.find((u) => u.id === entry.userId);

            if (user) {
                await useUserStore.getState().deleteUser(user.id);
            }

            // Delete directive
            await window.electronAPI.directives.deleteById(id);

            // Refresh local list
            await get().fetchAll();
        }
    },

    clearAllVyklyuchennya: async () => {
        await window.electronAPI.directives.clearByType('exclude');
        set({ list: [] });
    },
}));
