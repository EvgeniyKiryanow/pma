import {
    AWARD_CHANNELS,
    COMMENT_CHANNELS,
    DIRECTIVE_CHANNELS,
    DOCUMENT_CHANNELS,
    HISTORY_CHANNELS,
    JOURNAL_CHANNELS,
    PERSONNEL_CHANNELS,
} from '../../shared/ipc/channels';
import type { Result } from '../../shared/ipc/result';
import type { AwardType, AwardTypeInput } from '../../shared/types/awards';
import type { ActionStatus } from '../../shared/types/common';
import type { DirectiveInput, DirectiveRecord, DirectiveType } from '../../shared/types/directive';
import type {
    DocumentCategory,
    NewDocumentsInput,
    PersonDocument,
    RecentFile,
} from '../../shared/types/documents';
import type {
    HistoryRange,
    IncompleteHistoryEntry,
    RecentStatusChange,
    StatusPeriodEntry,
} from '../../shared/types/history';
import type { JournalEntry, JournalEntryInput } from '../../shared/types/journal';
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
    getRecentStatusChanges: (limit?: number) =>
        invoke<RecentStatusChange[]>(HISTORY_CHANNELS.recentStatusChanges, limit),
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

/** The awards register: own awards of the unit, documents of the awards in the cards. */
export const awardsApi = {
    listTypes: () => invoke<Result<AwardType[]>>(AWARD_CHANNELS.listTypes),
    saveType: (input: AwardTypeInput) => invoke<Result<AwardType>>(AWARD_CHANNELS.saveType, input),
    removeType: (uuid: string) => invoke<Result<void>>(AWARD_CHANNELS.removeType, uuid),
    /** A document of an award as a data URL. */
    loadFile: (userId: number, recordId: string, fileName: string) =>
        invoke<Result<string>>(AWARD_CHANNELS.loadFile, userId, recordId, fileName),
};

/** «Документи» of a person in categories; the files added lately anywhere. */
export const documentsApi = {
    categories: (userId?: number) =>
        invoke<Result<DocumentCategory[]>>(DOCUMENT_CHANNELS.categories, userId),
    addCategory: (name: string) =>
        invoke<Result<DocumentCategory>>(DOCUMENT_CHANNELS.addCategory, name),
    renameCategory: (uuid: string, name: string) =>
        invoke<Result<void>>(DOCUMENT_CHANNELS.renameCategory, uuid, name),
    removeCategory: (uuid: string) => invoke<Result<void>>(DOCUMENT_CHANNELS.removeCategory, uuid),
    list: (userId: number) => invoke<Result<PersonDocument[]>>(DOCUMENT_CHANNELS.list, userId),
    add: (input: NewDocumentsInput) =>
        invoke<Result<PersonDocument[]>>(DOCUMENT_CHANNELS.add, input),
    update: (uuid: string, patch: { name?: string; categoryUuid?: string | null; note?: string }) =>
        invoke<Result<PersonDocument>>(DOCUMENT_CHANNELS.update, uuid, patch),
    remove: (uuid: string) => invoke<Result<void>>(DOCUMENT_CHANNELS.remove, uuid),
    load: (uuid: string) => invoke<Result<string>>(DOCUMENT_CHANNELS.load, uuid),
    recent: (limit?: number) => invoke<Result<RecentFile[]>>(DOCUMENT_CHANNELS.recent, limit),
};

/** The working journal (planner). */
export const journalApi = {
    list: () => invoke<Result<JournalEntry[]>>(JOURNAL_CHANNELS.list),
    save: (entry: JournalEntryInput) => invoke<Result<JournalEntry>>(JOURNAL_CHANNELS.save, entry),
    setDone: (uuid: string, done: boolean) =>
        invoke<Result<JournalEntry>>(JOURNAL_CHANNELS.setDone, uuid, done),
    setPinned: (uuid: string, pinned: boolean) =>
        invoke<Result<JournalEntry>>(JOURNAL_CHANNELS.setPinned, uuid, pinned),
    remove: (uuid: string) => invoke<Result<void>>(JOURNAL_CHANNELS.remove, uuid),
    loadFile: (uuid: string, fileName: string) =>
        invoke<Result<string>>(JOURNAL_CHANNELS.loadFile, uuid, fileName),
};
