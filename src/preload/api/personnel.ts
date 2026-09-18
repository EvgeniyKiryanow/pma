import {
    COMMENT_CHANNELS,
    DIRECTIVE_CHANNELS,
    HISTORY_CHANNELS,
    PERSONNEL_CHANNELS,
} from '../../shared/ipc/channels';
import type { ActionStatus } from '../../shared/types/common';
import type { DirectiveInput, DirectiveRecord, DirectiveType } from '../../shared/types/directive';
import type {
    HistoryRange,
    IncompleteHistoryEntry,
    StatusPeriodEntry,
} from '../../shared/types/history';
import type { CommentOrHistoryEntry, User } from '../../shared/types/user';
import { invoke } from '../invoke';

/** Personnel records. Kept flat on the bridge for the screens that already use it. */
export const personnelApi = {
    fetchUsersMetadata: () => invoke<User[]>(PERSONNEL_CHANNELS.list),
    users: {
        getOne: (id: number) => invoke<User | null>(PERSONNEL_CHANNELS.getOne, id),
    },
    addUser: (user: Omit<User, 'id'> | User) => invoke<User>(PERSONNEL_CHANNELS.create, user),
    /** The updated person, or the failure shape when it no longer exists or the write failed. */
    updateUser: (user: User) => invoke<User | ActionStatus>(PERSONNEL_CHANNELS.update, user),
    deleteUser: (id: number) => invoke<boolean>(PERSONNEL_CHANNELS.remove, id),
    bulkUpdateUsers: (users: Partial<User>[]) =>
        invoke<{ success: boolean; error?: string }>(
            PERSONNEL_CHANNELS.bulkUpdateAssignments,
            users,
        ),
    getDbColumns: () => invoke<string[]>(PERSONNEL_CHANNELS.listColumns),
};

export const historyApi = {
    getUserHistory: (userId: number, filter: string) =>
        invoke<CommentOrHistoryEntry[]>(HISTORY_CHANNELS.list, userId, filter),
    getUserHistoryByRange: (userId: number, range: HistoryRange) =>
        invoke<CommentOrHistoryEntry[]>(HISTORY_CHANNELS.listByRange, userId, range),
    addUserHistory: (userId: number, newEntry: CommentOrHistoryEntry) =>
        invoke<ActionStatus>(HISTORY_CHANNELS.add, userId, newEntry),
    editUserHistory: (userId: number, updatedEntry: CommentOrHistoryEntry) =>
        invoke<ActionStatus>(HISTORY_CHANNELS.edit, userId, updatedEntry),
    deleteUserHistory: (id: number) => invoke<ActionStatus>(HISTORY_CHANNELS.remove, id),
    loadHistoryFile: (userId: number, entryId: number, filename: string) =>
        invoke<{ dataUrl: string }>(HISTORY_CHANNELS.loadFile, userId, entryId, filename),
    findIncompleteHistory: () => invoke<IncompleteHistoryEntry[]>(HISTORY_CHANNELS.findIncomplete),
    getStatusPeriods: () => invoke<StatusPeriodEntry[]>(HISTORY_CHANNELS.statusPeriods),
};

export const commentsApi = {
    getUserComments: (userId: number) =>
        invoke<CommentOrHistoryEntry[]>(COMMENT_CHANNELS.list, userId),
    addUserComment: (userId: number, newComment: CommentOrHistoryEntry) =>
        invoke<ActionStatus>(COMMENT_CHANNELS.add, userId, newComment),
    deleteUserComment: (id: number) => invoke<boolean>(COMMENT_CHANNELS.remove, id),
};

/** Orders, exclusions and restorations. */
export const directivesApi = {
    add: (entry: DirectiveInput) => invoke<void>(DIRECTIVE_CHANNELS.add, entry),
    getAllByType: (type: DirectiveType) =>
        invoke<DirectiveRecord[]>(DIRECTIVE_CHANNELS.listByType, type),
    deleteById: (id: number) => invoke<void>(DIRECTIVE_CHANNELS.removeById, id),
    delete: (params: { userId: number; date: string }) =>
        invoke<void>(DIRECTIVE_CHANNELS.removeByUserAndDate, params),
    clearByType: (type: DirectiveType) => invoke<void>(DIRECTIVE_CHANNELS.clearByType, type),
};
