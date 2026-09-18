import { create } from 'zustand';

/**
 * What the global search asks a section to show once it opens: the register filtered by an
 * award, the saved reports by a name, a template opened, the БЧС filtered by a number.
 * The section takes its part and clears it.
 */
export type SearchJumps = {
    awards?: string;
    reports?: { view: 'upload' | 'yourSaved'; query?: string; templateId?: string };
    staffing?: string;
    /** A journal entry to open, or 'new'. */
    journal?: string;
};

type SearchJumpState = {
    jumps: SearchJumps;
    jump: (jumps: SearchJumps) => void;
    clear: (key: keyof SearchJumps) => void;
};

export const useSearchJump = create<SearchJumpState>((set) => ({
    jumps: {},
    jump: (jumps) => set({ jumps }),
    clear: (key) => set((state) => ({ jumps: { ...state.jumps, [key]: undefined } })),
}));
