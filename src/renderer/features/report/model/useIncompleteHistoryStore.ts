import { create } from 'zustand';

type IncompleteEntry = {
    userId: number;
    entryId: number;
    reason: 'missing_file' | 'missing_period' | 'missing_both';
};

type IncompleteHistoryStore = {
    entries: IncompleteEntry[];
    /** Recomputed in the main process from the stored history. */
    load: () => Promise<void>;
    addIncomplete: (userId: number, entryId: number, reason: IncompleteEntry['reason']) => void;
    clearAll: () => void;
};

export const useIncompleteHistoryStore = create<IncompleteHistoryStore>((set) => ({
    entries: [],
    load: async () => {
        set({ entries: await window.electronAPI.findIncompleteHistory() });
    },
    addIncomplete: (userId, entryId, reason) =>
        set((state) => ({
            entries: [
                ...state.entries.filter((e) => e.entryId !== entryId), // avoid duplicates
                { userId, entryId, reason },
            ],
        })),
    clearAll: () => set({ entries: [] }),
}));
