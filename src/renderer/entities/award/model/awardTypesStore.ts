import { create } from 'zustand';

import { customAwardDef, setCustomAwards } from '../../../../shared/awards/catalog';
import type { AwardType, AwardTypeInput } from '../../../../shared/types/awards';
import { awardsApi } from '../../../shared/api/awards';
import { reportError } from '../../../shared/api/errors';

type AwardTypesState = {
    types: AwardType[];
    loaded: boolean;
    /** Changes with every load: components that read the catalogue re-render on it. */
    version: number;
    load: () => Promise<void>;
    save: (input: AwardTypeInput) => Promise<AwardType>;
    remove: (uuid: string) => Promise<void>;
};

function publish(types: AwardType[]) {
    setCustomAwards(types.map(customAwardDef));
}

/** The unit's own awards, known to the shared catalogue (`findAward`, pickers, icons). */
export const useAwardTypesStore = create<AwardTypesState>((set, get) => ({
    types: [],
    loaded: false,
    version: 0,
    load: async () => {
        try {
            const types = await awardsApi.listTypes();
            publish(types);
            set({ types, loaded: true, version: get().version + 1 });
        } catch (err) {
            reportError(err, { context: 'award-types' });
        }
    },
    save: async (input) => {
        const saved = await awardsApi.saveType(input);
        const types = [...get().types.filter((t) => t.uuid !== saved.uuid), saved].sort(
            (a, b) => Number(a.retired) - Number(b.retired) || a.name.localeCompare(b.name, 'uk'),
        );
        publish(types);
        set({ types, version: get().version + 1 });
        return saved;
    },
    remove: async (uuid) => {
        await awardsApi.removeType(uuid);
        const types = get().types.filter((t) => t.uuid !== uuid);
        publish(types);
        set({ types, version: get().version + 1 });
    },
}));

/** Re-renders the caller when the own awards change. */
export function useCustomAwardsVersion(): number {
    return useAwardTypesStore((s) => s.version);
}
