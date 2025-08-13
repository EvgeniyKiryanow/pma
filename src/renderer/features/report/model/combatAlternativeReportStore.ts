// stores/combatReportStore.ts
import { create } from 'zustand';

type CombatAlternativeReportState = {
    overrides: Record<string, number>;
    setOverride: (key: string, value: number) => void;
};

export const useCombatReportStore = create<CombatAlternativeReportState>((set) => ({
    overrides: {},

    setOverride: (key, value) =>
        set((state) => ({
            overrides: {
                ...state.overrides,
                [key]: value,
            },
        })),
}));
