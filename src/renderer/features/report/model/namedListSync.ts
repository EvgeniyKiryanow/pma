import { personnelEvents, type StatusChange } from '../../../shared/lib/personnelEvents';
import { statusCode } from './namedListDays';
import { useNamedListStore } from './useNamedListStore';

const norm = (text: string | null | undefined) =>
    String(text ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

function monthKey(now: Date): string {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Today's mark of the person in this month's named list follows a status change — unless it
 * was typed in by hand (it differs from the mark of the previous status).
 */
export async function applyStatusToNamedList({ user, from, to }: StatusChange): Promise<void> {
    const store = useNamedListStore.getState();
    if (!store.loadedOnce) await store.loadAllTables();
    const now = new Date();
    const key = monthKey(now);
    const rows = useNamedListStore.getState().tables[key];
    if (!rows) return;
    const row = rows.find(
        (r) => norm(r.fullName) === norm(user.fullName) && norm(r.rank) === norm(user.rank),
    );
    if (!row) return;
    const dayIndex = now.getDate() - 1;
    const current = row.attendance[dayIndex] ?? '';
    const next = statusCode(to);
    if (current === next) return;
    if (current !== '' && current !== statusCode(from)) return;
    await useNamedListStore.getState().updateCell(key, row.id, dayIndex, next);
}

/** Installed once by the app. */
export function installNamedListStatusSync(): () => void {
    return personnelEvents.onStatusChange(applyStatusToNamedList);
}
