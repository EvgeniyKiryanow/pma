import { create } from 'zustand';

import { reportError } from '../../../shared/api/errors';
import { namedListApi } from '../../../shared/api/reports';

export type AttendanceRow = {
    id: number;
    rank: string;
    fullName: string;
    attendance: string[];
    shpkNumber: string;
    exclusion?: {
        description: string;
        periodFrom: string;
        startIndex: number;
    };
};

type NamedListStore = {
    tables: Record<string, AttendanceRow[]>;
    activeKey: string | null;
    loadedOnce: boolean;

    createTable: (key: string, rows: AttendanceRow[]) => Promise<void>;
    getTable: (key: string) => AttendanceRow[] | undefined;
    updateCell: (key: string, rowId: number, dayIndex: number, value: string) => Promise<void>;
    deleteTable: (key: string) => Promise<void>;
    setActiveKey: (key: string) => void;
    loadAllTables: () => Promise<void>;
};

/** Month key of today, e.g. "2026-09". */
function currentMonthKey(now = new Date()): string {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Monthly named lists (табель). Changes are shown at once (the table is edited cell by cell)
 * and rolled back with a notification when the database does not accept them.
 */
export const useNamedListStore = create<NamedListStore>((set, get) => ({
    tables: {},
    activeKey: null,
    loadedOnce: false,

    createTable: async (key, rows) => {
        if (get().tables[key]) return;
        const previousKey = get().activeKey;
        set((state) => ({ tables: { ...state.tables, [key]: rows }, activeKey: key }));

        try {
            await namedListApi.create(key, rows);
        } catch (error) {
            set((state) => {
                const tables = { ...state.tables };
                delete tables[key];
                return {
                    tables,
                    activeKey: state.activeKey === key ? previousKey : state.activeKey,
                };
            });
            reportError(error, { context: 'named-list.create' });
        }
    },

    getTable: (key) => get().tables[key],

    loadAllTables: async () => {
        if (get().loadedOnce) return;

        let records: Awaited<ReturnType<typeof namedListApi.list>>;
        try {
            records = await namedListApi.list();
        } catch (error) {
            // `loadedOnce` stays false, so the next visit tries again.
            reportError(error, { context: 'named-list.load' });
            return;
        }

        const tables = records.reduce<Record<string, AttendanceRow[]>>((acc, { key, data }) => {
            acc[key] = data;
            return acc;
        }, {});
        const currentKey = currentMonthKey();

        set({
            tables,
            loadedOnce: true,
            activeKey: tables[currentKey] ? currentKey : (Object.keys(tables)[0] ?? null),
        });
    },

    updateCell: async (key, rowId, dayIndex, value) => {
        const current = get().tables[key];
        if (!current) return;

        const updated = current.map((row) =>
            row.id === rowId
                ? { ...row, attendance: row.attendance.map((v, i) => (i === dayIndex ? value : v)) }
                : row,
        );
        set((state) => ({ tables: { ...state.tables, [key]: updated } }));

        try {
            await namedListApi.updateCell(key, rowId, dayIndex, value);
        } catch (error) {
            // Roll back only if nothing else changed the table meanwhile.
            set((state) =>
                state.tables[key] === updated
                    ? { tables: { ...state.tables, [key]: current } }
                    : state,
            );
            reportError(error, { context: 'named-list.update-cell' });
        }
    },

    deleteTable: async (key) => {
        const previous = get().tables[key];
        set((state) => {
            const tables = { ...state.tables };
            delete tables[key];
            return { tables };
        });

        try {
            await namedListApi.remove(key);
        } catch (error) {
            if (previous) set((state) => ({ tables: { ...state.tables, [key]: previous } }));
            reportError(error, { context: 'named-list.delete' });
        }
    },

    setActiveKey: (key) => set({ activeKey: key }),
}));
