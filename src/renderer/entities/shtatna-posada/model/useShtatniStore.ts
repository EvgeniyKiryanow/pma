import { create } from 'zustand';

import { reportError } from '../../../shared/api/errors';
import { staffingApi } from '../../../shared/api/reports';

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

    fetchAll: () => Promise<void>;
    /** Throws ApiError: the import screen reports the outcome itself. */
    importFromExcel: (
        positions: ShtatnaPosada[],
    ) => Promise<{ added: number; skipped: number; total: number }>;
    /** The actions below report a failure to the user and resolve to false. */
    updatePosada: (pos: ShtatnaPosada) => Promise<boolean>;
    deletePosada: (shtat_number: string) => Promise<boolean>;
    deleteAll: () => Promise<boolean>;
};

export const useShtatniStore = create<ShtatniState>((set, get) => {
    /** Runs a change, reloads the list on success, reports a failure. */
    const mutate = async (work: () => Promise<unknown>, context: string): Promise<boolean> => {
        try {
            await work();
        } catch (error) {
            reportError(error, { context });
            return false;
        }
        await get().fetchAll();
        return true;
    };

    return {
        shtatniPosady: [],
        loading: false,

        fetchAll: async () => {
            set({ loading: true });
            try {
                set({ shtatniPosady: await staffingApi.list() });
            } catch (error) {
                reportError(error, { context: 'staffing.list' });
            } finally {
                set({ loading: false });
            }
        },

        importFromExcel: async (positions) => {
            const result = await staffingApi.import(positions);
            await get().fetchAll();
            return result;
        },

        updatePosada: (pos) => mutate(() => staffingApi.update(pos), 'staffing.update'),
        deletePosada: (number) => mutate(() => staffingApi.remove(number), 'staffing.delete'),
        deleteAll: () => mutate(() => staffingApi.removeAll(), 'staffing.delete-all'),
    };
});
