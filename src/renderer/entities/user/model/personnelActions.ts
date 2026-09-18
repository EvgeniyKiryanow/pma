import type { CommentOrHistoryEntry, User } from '../../../../shared/types/user';
import { historyApi } from '../../../shared/api/personnel';
import { personnelEvents } from '../../../shared/lib/personnelEvents';
import { useUserStore } from '../../../stores/userStore';
import type { ShtatnaPosada } from '../../shtatna-posada/model/useShtatniStore';

/**
 * Changes other screens make to a person on the spot (the БЧС table, the reports). Each one
 * saves the card, leaves a record in the person's history and refreshes the shared list, so
 * the card, the БЧС and every report show the change at once. Errors reach the caller.
 */

type Position = Pick<
    ShtatnaPosada,
    'shtat_number' | 'unit_name' | 'position_name' | 'category' | 'shpk_code'
>;

function record(
    type: CommentOrHistoryEntry['type'],
    description: string,
    content = '',
): CommentOrHistoryEntry {
    return {
        id: Date.now(),
        date: new Date().toISOString(),
        type,
        author: 'System',
        description,
        content,
        files: [],
    };
}

const describePosition = (pos: Position) => `${pos.position_name ?? ''} (${pos.unit_name ?? ''})`;

async function saveWithHistory(user: User, entry: CommentOrHistoryEntry): Promise<void> {
    // The card first: what the reports count is the saved card, the record explains it.
    await useUserStore.getState().updateUser(user);
    await historyApi.add(user.id, entry);
    useUserStore.setState((state) => ({ historyVersion: state.historyVersion + 1 }));
}

/** Sets a new status; the history says from what to what. */
export async function changeStatus(user: User, status: string): Promise<User> {
    const previous = user.soldierStatus || 'Без статусу';
    const updated: User = { ...user, soldierStatus: status };
    await saveWithHistory(updated, {
        ...record(
            'statusChange',
            `Статус змінено з "${previous}" → "${status}"`,
            `Статус змінено з "${previous}" на "${status}"`,
        ),
        status,
        previousStatus: previous,
    });
    await personnelEvents.statusChanged({
        user: updated,
        from: user.soldierStatus ?? '',
        to: status,
    });
    return updated;
}

/** Takes the person off their staff position; the position becomes vacant. */
export async function removeFromPosition(user: User, pos?: Position): Promise<User> {
    const where = pos ? describePosition(pos) : `${user.position ?? ''} (${user.unitMain ?? ''})`;
    const cleared: User = {
        ...user,
        position: null,
        unitMain: null,
        shpkCode: null,
        shpkNumber: null,
        category: null,
    };
    await saveWithHistory(
        cleared,
        record('history', `Користувача ${user.fullName} звільнено з посади ${where}`),
    );
    return cleared;
}

/** Puts the person on a staff position; whoever held it is taken off first. */
export async function assignToPosition(user: User, pos: Position): Promise<User> {
    const number = String(pos.shtat_number);
    const holder = useUserStore
        .getState()
        .users.find((u) => u.id !== user.id && String(u.shpkNumber ?? '') === number);
    if (holder) await removeFromPosition(holder, pos);

    const moving = Boolean(user.shpkNumber) && String(user.shpkNumber) !== number;
    const description = moving
        ? `Переміщено з посади ${user.position} (${user.unitMain}) → ${describePosition(pos)}`
        : `Призначено на посаду ${describePosition(pos)}`;
    const updated: User = {
        ...user,
        position: pos.position_name,
        unitMain: pos.unit_name,
        shpkCode: pos.shpk_code,
        shpkNumber: pos.shtat_number,
        category: pos.category,
    };
    await saveWithHistory(updated, record('history', description));
    return updated;
}
