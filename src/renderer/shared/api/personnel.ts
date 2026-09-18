import type {
    HistoryRange,
    IncompleteHistoryEntry,
    StatusPeriodEntry,
} from '../../../shared/types/history';
import type { CommentOrHistoryEntry, User } from '../../../shared/types/user';
import { bridge, call, expectSuccess, isFailure } from './bridge';
import { ApiError } from './call';

/** Personnel records. Every function throws `ApiError` on failure. */
export const personnelApi = {
    /** Everyone, without history and comments (they are loaded per person). */
    list: (): Promise<User[]> => call(bridge().fetchUsersMetadata()),

    /** One person with history and comments; `null` if there is no such person. */
    get: (id: number): Promise<User | null> => call(bridge().users.getOne(id)),

    create: (user: Omit<User, 'id'>): Promise<User> => call(bridge().addUser(user)),

    /** Saves everything except history and comments (they have their own calls). */
    update: async (user: User): Promise<User> => {
        const reply = await call(bridge().updateUser(user));
        if (isFailure(reply)) throw new ApiError('NOT_FOUND');
        return reply as User;
    },

    remove: async (id: number): Promise<void> => {
        if (!(await call(bridge().deleteUser(id)))) throw new ApiError('NOT_FOUND');
    },

    /** Staff position fields of many people at once; all or nothing. */
    assignPositions: async (users: Partial<User>[]): Promise<void> => {
        await expectSuccess(bridge().bulkUpdateUsers(users), 'INTERNAL');
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
    /** Status changes with a period, of everyone. */
    statusPeriods: (): Promise<StatusPeriodEntry[]> => call(bridge().getStatusPeriods()),
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
