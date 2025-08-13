// stores/useCombinedStore.ts
import { create } from 'zustand';
import type { User } from '../types/user';
import type { ShtatnaPosada } from './useShtatniStore';

export type MergedUserWithPosada = {
    user: User;
    matchedPosada?: ShtatnaPosada;
};

export type VacantPosada = {
    posada: ShtatnaPosada;
    reason: 'no-user-found';
};

type CombinedState = {
    users: User[];
    shtatniPosady: ShtatnaPosada[];
    merged: MergedUserWithPosada[];
    vacantPosady: VacantPosada[];
    unmatchedUsers: User[];
    loading: boolean;

    fetchAllAndMerge: () => Promise<void>;
    recomputeMerge: () => void;
};

function normalize(str?: string) {
    return (str || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function mergeUsersWithPosady(
    users: User[],
    shtatni: ShtatnaPosada[],
): { merged: MergedUserWithPosada[]; vacant: VacantPosada[]; unmatched: User[] } {
    const usedPosadyIds = new Set<string>();

    const merged: MergedUserWithPosada[] = users.map((user) => {
        const normShpk = normalize(user.shpkCode);
        const normPos = normalize(user.position);
        const normUnit = normalize(user.unitMain || user.unitNumber);

        // 1) Try SHPK exact match
        let matched = shtatni.find((p) => normalize(p.shpk_code) === normShpk);

        // 2) Try position name
        if (!matched && normPos) {
            matched = shtatni.find((p) => normalize(p.position_name) === normPos);
        }

        // 3) Try unit + category combo
        if (!matched && normUnit) {
            matched = shtatni.find(
                (p) =>
                    normalize(p.unit_name) === normUnit &&
                    normalize(p.category) === normalize(user.category),
            );
        }

        if (matched) {
            usedPosadyIds.add(matched.shtat_number);
        }

        return { user, matchedPosada: matched };
    });

    // Compute vacant posady (those never matched)
    const vacant: VacantPosada[] = shtatni
        .filter((p) => !usedPosadyIds.has(p.shtat_number))
        .map((p) => ({ posada: p, reason: 'no-user-found' }));

    // Users without posada
    const unmatchedUsers = merged.filter((m) => !m.matchedPosada).map((m) => m.user);

    return { merged, vacant, unmatched: unmatchedUsers };
}

export const useCombinedStore = create<CombinedState>((set, get) => ({
    users: [],
    shtatniPosady: [],
    merged: [],
    vacantPosady: [],
    unmatchedUsers: [],
    loading: false,

    fetchAllAndMerge: async () => {
        set({ loading: true });
        try {
            const [users, shtatni] = await Promise.all([
                window.electronAPI.fetchUsersMetadata(),
                window.electronAPI.shtatni.fetchAll(),
            ]);

            const { merged, vacant, unmatched } = mergeUsersWithPosady(users, shtatni);

            set({
                users,
                shtatniPosady: shtatni,
                merged,
                vacantPosady: vacant,
                unmatchedUsers: unmatched,
                loading: false,
            });
        } catch (e) {
            console.error('❌ Failed to fetch combined data', e);
            set({ loading: false });
        }
    },

    recomputeMerge: () => {
        const { users, shtatniPosady } = get();
        const { merged, vacant, unmatched } = mergeUsersWithPosady(users, shtatniPosady);
        set({ merged, vacantPosady: vacant, unmatchedUsers: unmatched });
    },
}));
