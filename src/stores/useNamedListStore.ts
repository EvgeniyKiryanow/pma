import { create } from 'zustand';

export type AttendanceRow = {
    id: number;
    rank: string;
    fullName: string;
    attendance: string[];
    shpkNumber: string;
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

export const useNamedListStore = create<NamedListStore>((set, get) => ({
    tables: {},
    activeKey: null,
    loadedOnce: false,

    createTable: async (key, rows) => {
        const existing = get().tables[key];
        if (existing) return;

        set((state) => ({
            tables: {
                ...state.tables,
                [key]: rows,
            },
            activeKey: key, // ✅ Automatically activate new table
        }));

        await window.electronAPI.namedList.create(key, rows);
    },

    getTable: (key) => get().tables[key],

    loadAllTables: async () => {
        if (get().loadedOnce) return;

        const dbTables = await window.electronAPI.namedList.getAll();

        const tablesArray: any = Array.isArray(dbTables) ? dbTables : [];
        const mapped = tablesArray.reduce((acc: Record<string, AttendanceRow[]>, { key, data }) => {
            acc[key] = data;
            return acc;
        }, {});

        const now = new Date();
        const currentKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

        set({
            tables: mapped,
            loadedOnce: true,
            activeKey: mapped[currentKey] ? currentKey : (Object.keys(mapped)[0] ?? null), // ✅ Set activeKey
        });
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

        set((state) => ({
            tables: {
                ...state.tables,
                [key]: updated,
            },
        }));

        await window.electronAPI.namedList.updateCell(key, rowId, dayIndex, value);
    },

    deleteTable: async (key) => {
        set((state) => {
            const newTables = { ...state.tables };
            delete newTables[key];
            return { tables: newTables };
        });

        await window.electronAPI.namedList.delete(key);
    },

    setActiveKey: (key) => set({ activeKey: key }),
}));
