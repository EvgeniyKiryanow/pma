// stores/useNamedListStore.ts
import { create } from 'zustand';

export type AttendanceRow = {
    id: number;
    rank: string;
    fullName: string;
    attendance: string[]; // length 31
};

type NamedListStore = {
    tables: Record<string, AttendanceRow[]>; // key = '2025-08'
    activeKey: string | null;

    createTable: (key: string, rows: AttendanceRow[]) => void;
    getTable: (key: string) => AttendanceRow[] | undefined;
    updateCell: (key: string, rowId: number, dayIndex: number, value: string) => void;
    deleteTable: (key: string) => void;
    setActiveKey: (key: string) => void;
};

export const useNamedListStore = create<NamedListStore>((set, get) => ({
    tables: {},
    activeKey: null,

    createTable: (key, rows) => {
        set((state) => ({
            tables: {
                ...state.tables,
                [key]: rows,
            },
        }));
    },

    getTable: (key) => {
        return get().tables[key];
    },

    updateCell: (key, rowId, dayIndex, value) => {
        set((state) => {
            const current = state.tables[key];
            if (!current) return {};

            const updated = current.map((row) =>
                row.id === rowId
                    ? {
                          ...row,
                          attendance: row.attendance.map((v, i) => (i === dayIndex ? value : v)),
                      }
                    : row,
            );

            return {
                tables: {
                    ...state.tables,
                    [key]: updated,
                },
            };
        });
    },

    deleteTable: (key) => {
        set((state) => {
            const newTables = { ...state.tables };
            delete newTables[key];
            return { tables: newTables };
        });
    },

    setActiveKey: (key) => {
        set({ activeKey: key });
    },
}));
