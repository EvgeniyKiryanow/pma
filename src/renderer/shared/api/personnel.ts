import type {
    DayRange,
    HistoryRange,
    IncompleteHistoryEntry,
    RecentStatusChange,
    StatusPeriodEntry,
} from '../../../shared/types/history';
import type { CommentOrHistoryEntry, User } from '../../../shared/types/user';
import { bridge, call, expectSuccess, isFailure } from './bridge';
import { ApiError } from './call';

/**
 * Screens that open together (sign-in: the desktop, the header, the list) each ask for
 * everyone. Calls made while one is on its way share it — unless a change was saved since
 * it started, then the list is read again.
 */
let saved = 0;
let pending: { at: number; list: Promise<User[]> } | null = null;

/** Wraps a change of people: a list asked for afterwards is read anew. */
async function change<T>(work: Promise<T>): Promise<T> {
    try {
        return await work;
    } finally {
        saved++;
    }
}

/** Personnel records. Every function throws `ApiError` on failure. */
export const personnelApi = {
    /** Everyone, without history, comments and photos (lists show `photoThumb`). */
    list: (): Promise<User[]> => {
        if (pending && pending.at === saved) return pending.list;
        const list: Promise<User[]> = call(bridge().fetchUsersMetadata());
        const entry = { at: saved, list };
        pending = entry;
        const clear = () => {
            if (pending === entry) pending = null;
        };
        // Only clears the shared call; the caller gets the result or the error of `list`.
        list.then(clear, clear).catch(() => undefined);
        return list;
    },

    /** One person with history and comments; `null` if there is no such person. */
    get: (id: number): Promise<User | null> => call(bridge().users.getOne(id)),

    create: (user: Omit<User, 'id'>): Promise<User> => change(call(bridge().addUser(user))),

    /** Saves everything except history and comments (they have their own calls). */
    update: async (user: User): Promise<User> => {
        const reply = await change(call(bridge().updateUser(user)));
        if (isFailure(reply)) throw new ApiError('NOT_FOUND');
        return reply as User;
    },

    remove: async (id: number): Promise<void> => {
        if (!(await change(call(bridge().deleteUser(id))))) throw new ApiError('NOT_FOUND');
    },

    /** Staff position fields of many people at once; all or nothing. */
    assignPositions: async (users: Partial<User>[]): Promise<void> => {
        await change(expectSuccess(bridge().bulkUpdateUsers(users), 'INTERNAL'));
    },

    columns: (): Promise<string[]> => call(bridge().getDbColumns()),
};

export const historyApi = {
    /** `filter`: '1day' | '7days' | '14days' | '30days' | 'all'. */
    list: (userId: number, filter: string): Promise<CommentOrHistoryEntry[]> =>
        call(bridge().getUserHistory(userId, filter)),
    listByRange: (userId: number, range: HistoryRange): Promise<CommentOrHistoryEntry[]> =>
        call(bridge().getUserHistoryByRange(userId, range)),
    add: async (userId: number, entry: CommentOrHistoryEntry): Promise<void> => {
        await expectSuccess(bridge().addUserHistory(userId, entry), 'NOT_FOUND');
    },
    edit: async (userId: number, entry: CommentOrHistoryEntry): Promise<void> => {
        await expectSuccess(bridge().editUserHistory(userId, entry), 'NOT_FOUND');
    },
    remove: async (entryId: number): Promise<void> => {
        await expectSuccess(bridge().deleteUserHistory(entryId), 'NOT_FOUND');
    },
    /** Attachment content as a data URL. */
    loadFile: async (userId: number, entryId: number, fileName: string): Promise<string> =>
        (await call(bridge().loadHistoryFile(userId, entryId, fileName))).dataUrl,
    findIncomplete: (): Promise<IncompleteHistoryEntry[]> => call(bridge().findIncompleteHistory()),
    /** Status changes with a period, of everyone; with `range` only those that may touch it. */
    statusPeriods: (range?: DayRange): Promise<StatusPeriodEntry[]> =>
        call(bridge().getStatusPeriods(range)),
    /** The latest status changes of everyone, newest first. */
    recentStatusChanges: (limit?: number): Promise<RecentStatusChange[]> =>
        call(bridge().getRecentStatusChanges(limit)),
};

export const commentsApi = {
    list: (userId: number): Promise<CommentOrHistoryEntry[]> =>
        call(bridge().getUserComments(userId)),
    add: async (userId: number, comment: CommentOrHistoryEntry): Promise<void> => {
        await expectSuccess(bridge().addUserComment(userId, comment), 'NOT_FOUND');
    },
    remove: async (commentId: number): Promise<void> => {
        await call(bridge().deleteUserComment(commentId));
    },
};
