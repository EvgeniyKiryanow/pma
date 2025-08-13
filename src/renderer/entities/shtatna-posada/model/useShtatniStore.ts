import { create } from 'zustand';

export type ShtatnaPosada = {
    shtat_number: string;
    unit_name?: string;
    position_name?: string;
    category?: string;
    shpk_code?: string;
    extra_data?: Record<string, any>;
    unitMain?: any;
};

type ShtatniState = {
    shtatniPosady: ShtatnaPosada[];
    loading: boolean;

    // Actions
    fetchAll: () => Promise<void>;
    importFromExcel: (
        positions: ShtatnaPosada[],
    ) => Promise<{ added: number; skipped: number; total: number }>;
    updatePosada: (pos: ShtatnaPosada) => Promise<boolean>;
    deletePosada: (shtat_number: string) => Promise<boolean>;
    deleteAll: () => Promise<boolean>;
};

export const useShtatniStore = create<ShtatniState>((set, get) => ({
    shtatniPosady: [],
    loading: false,

    fetchAll: async () => {
        set({ loading: true });
        try {
            const list: ShtatnaPosada[] = await window.electronAPI.shtatni.fetchAll();
            set({ shtatniPosady: list, loading: false });
        } catch (error) {
            console.error('❌ Failed to fetch shtatni_posady', error);
            set({ loading: false });
        }
    },
    deleteAll: async () => {
        const res = await window.electronAPI.shtatni.deleteAll();
        if (res.success) await get().fetchAll();
        return res.success;
    },

    importFromExcel: async (positions) => {
        const result = await window.electronAPI.shtatni.import(positions);
        // After import → refresh the list
        await get().fetchAll();
        return result;
    },

    updatePosada: async (pos) => {
        const res = await window.electronAPI.shtatni.update(pos);
        if (res.success) {
            await get().fetchAll();
        }
        return res.success;
    },

    deletePosada: async (shtat_number) => {
        const res = await window.electronAPI.shtatni.delete(shtat_number);
        if (res.success) {
            await get().fetchAll();
        }
        return res.success;
    },
}));
