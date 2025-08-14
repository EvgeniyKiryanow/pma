// src/renderer/shared/sync/plannedTotalsSync.ts
import { buildPlannedTotalsFromShtatni } from '@/renderer/shared/utils/plannedTotalsFromShtatni';

// ⬇️ Use your actual store path (from your message)
import { useShtatniStore } from '../../entities/shtatna-posada/model/useShtatniStore';
// ⬇️ Use your actual UnitStatsCalculator path
import { UnitStatsCalculator } from '../../features/report/ui/_components/UnitStatsCalculator';

// HMR-safe singleton guard so we don't double-subscribe in dev
declare global {
    // eslint-disable-next-line no-var
    var __plannedTotalsSyncUnsub: null | (() => void) | undefined;
}

if (import.meta && (import.meta as any).hot) {
    // on hot updates, clean up previous subscription
    if (globalThis.__plannedTotalsSyncUnsub) {
        try {
            globalThis.__plannedTotalsSyncUnsub();
        } catch {}
    }
}

const unsub = useShtatniStore.subscribe(
    (s) => s.shtatniPosady,
    (shtatniPosady) => {
        const map = buildPlannedTotalsFromShtatni(shtatniPosady);
        UnitStatsCalculator.setPlannedTotals(map);
    },
    { fireImmediately: true },
);

// expose for cleanup / tests
export function unsubscribePlannedTotalsSync() {
    unsub?.();
}

globalThis.__plannedTotalsSyncUnsub = unsub;
