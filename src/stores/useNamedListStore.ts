import { create } from 'zustand';

export type AttendanceRow = {
    id: number;
    rank: string;
    fullName: string;
    attendance: string[];
};

type NamedListStore = {
    tables: Record<string, AttendanceRow[]>;
    activeKey: string | null;

    createTable: (key: string, rows: AttendanceRow[]) => Promise<void>;
    getTable: (key: string) => AttendanceRow[] | undefined;
    updateCell: (key: string, rowId: number, dayIndex: number, value: string) => Promise<void>;
    deleteTable: (key: string) => Promise<void>;
    setActiveKey: (key: string) => void;
    loadAllTables: () => Promise<void>;
};

export const useNamedListStore = create<NamedListStore>((set, get) => ({
    tables: {},
    activeKey: null,

    createTable: async (key, rows) => {
        const existing = get().tables[key];
        if (existing) return; // ✅ already exists, don't create again

        set((state) => ({
            tables: {
                ...state.tables,
                [key]: rows,
            },
        }));

        await window.electronAPI.namedList.create(key, rows);
    },

    getTable: (key) => {
        return get().tables[key];
    },
    loadAllTables: async () => {
        const dbTables = await window.electronAPI.namedList.getAll();
        const tablesArray: any = Array.isArray(dbTables) ? dbTables : [];
        const mapped = tablesArray.reduce(
            (acc: any, { key, data }) => {
                acc[key] = data;
                return acc;
            },
            {} as Record<string, AttendanceRow[]>,
        );

        set({ tables: mapped });
    },

    updateCell: async (key, rowId, dayIndex, value) => {
        const current = get().tables[key];
        if (!current) return;

        const updated = current.map((row) =>
            row.id === rowId
                ? {
                      ...row,
                      attendance: row.attendance.map((v, i) => (i === dayIndex ? value : v)),
                  }
                : row,
        );

        // Update state first
        set((state) => ({
            tables: {
                ...state.tables,
                [key]: updated,
            },
        }));

        // Sync to DB with change log
        await window.electronAPI.namedList.updateCell(key, rowId, dayIndex, value);
    },

    deleteTable: async (key) => {
        // Remove from state first
        set((state) => {
            const newTables = { ...state.tables };
            delete newTables[key];
            return { tables: newTables };
        });

        // Delete from DB and log
        await window.electronAPI.namedList.delete(key);
    },

    setActiveKey: (key) => {
        set({ activeKey: key });
    },
}));
