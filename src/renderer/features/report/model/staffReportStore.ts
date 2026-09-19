import { create } from 'zustand';

import type { LatestStatusPeriod } from '../../../../shared/types/history';
import { useShtatniStore } from '../../../entities/shtatna-posada/model/useShtatniStore';
import { historyApi } from '../../../shared/api/personnel';
import { useUserStore } from '../../../stores/userStore';
import {
    buildStaffRows,
    EMPTY_STAFF_FILTER,
    filterStaffRows,
    sortStaffRows,
    type StaffFilter,
    type StaffRow,
    type StaffSort,
} from './staffReport';

const STORAGE_KEY = 'pma.staffReport.view';

type Saved = { filter: StaffFilter; sort: StaffSort };

/** The filter of the last visit (this computer only); a broken or missing one is ignored. */
function readSaved(): Saved {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
        if (saved && typeof saved === 'object') {
            return {
                filter: { ...EMPTY_STAFF_FILTER, ...(saved.filter ?? {}) },
                sort: saved.sort ?? null,
            };
        }
    } catch {
        // storage unavailable: start without a filter
    }
    return { filter: EMPTY_STAFF_FILTER, sort: null };
}

function save(view: Saved): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
    } catch {
        // storage unavailable: the filter lives for this session only
    }
}

type StaffReportView = Saved & {
    periods: LatestStatusPeriod[];
    periodsLoaded: boolean;
    setFilter: (patch: Partial<StaffFilter>) => void;
    resetFilter: () => void;
    setSort: (sort: StaffSort) => void;
    loadPeriods: () => Promise<void>;
};

export const useStaffReportView = create<StaffReportView>((set, get) => ({
    ...readSaved(),
    periods: [],
    periodsLoaded: false,
    setFilter: (patch) => {
        set({ filter: { ...get().filter, ...patch } });
        save({ filter: get().filter, sort: get().sort });
    },
    resetFilter: () => {
        set({ filter: EMPTY_STAFF_FILTER });
        save({ filter: EMPTY_STAFF_FILTER, sort: get().sort });
    },
    setSort: (sort) => {
        set({ sort });
        save({ filter: get().filter, sort });
    },
    loadPeriods: async () => {
        try {
            set({ periods: await historyApi.latestPeriods() });
        } finally {
            set({ periodsLoaded: true });
        }
    },
}));

/** Every row of the report, before the filter. */
export function allStaffRows(periods = useStaffReportView.getState().periods): StaffRow[] {
    return buildStaffRows(
        useShtatniStore.getState().shtatniPosady,
        useUserStore.getState().users,
        periods,
    );
}

/** The rows the screen shows: filtered and sorted (the Excel export takes the same). */
export function visibleStaffRows(): StaffRow[] {
    const { filter, sort } = useStaffReportView.getState();
    return sortStaffRows(filterStaffRows(allStaffRows(), filter), sort);
}
