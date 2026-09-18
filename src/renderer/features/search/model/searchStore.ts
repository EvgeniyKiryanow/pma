import { create } from 'zustand';

import type { SearchCategory } from './globalSearch';

type SearchState = {
    open: boolean;
    query: string;
    category: SearchCategory | 'all';
    /**
     * Last queries of this session, newest first. Kept in memory only: names and numbers
     * typed here must not stay on the computer.
     */
    recent: string[];
    show: (query?: string) => void;
    hide: () => void;
    setQuery: (query: string) => void;
    setCategory: (category: SearchCategory | 'all') => void;
    remember: (query: string) => void;
    /** Forgets everything (the session ended). */
    reset: () => void;
};

export const useGlobalSearch = create<SearchState>((set) => ({
    open: false,
    query: '',
    category: 'all',
    recent: [],
    show: (query) => set((state) => ({ open: true, query: query ?? state.query })),
    hide: () => set({ open: false }),
    setQuery: (query) => set({ query }),
    setCategory: (category) => set({ category }),
    remember: (query) =>
        set((state) => {
            const text = query.trim();
            if (text.length < 2) return state;
            return { recent: [text, ...state.recent.filter((q) => q !== text)].slice(0, 8) };
        }),
    reset: () => set({ open: false, query: '', category: 'all', recent: [] }),
}));
