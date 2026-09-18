import { COMMENT_CHANNELS, HISTORY_CHANNELS, PERSONNEL_CHANNELS } from '../../shared/ipc/channels';
import type { HistoryRange } from '../../shared/types/history';
import type { CommentOrHistoryEntry } from '../../shared/types/user';
import type { Logger } from '../core/logger';
import { recoverFrom, toStatus } from '../ipc/legacy';
import { access, handle } from '../ipc/secureHandle';
import {
    requireArray,
    requireInt,
    requireObject,
    requireOneOf,
    requireString,
} from '../ipc/validate';
import type { CommentService } from './CommentService';
import type { HistoryService } from './HistoryService';
import type { Assignment } from './PersonnelRepository';
import type { PersonnelService } from './PersonnelService';

const HISTORY_RANGES: readonly HistoryRange[] = ['1d', '7d', '30d', 'all'];

/** An entry with an id and at most 100 attachments. */
function requireEntry(value: unknown, field: string): CommentOrHistoryEntry {
    const entry = requireObject(value, field) as unknown as CommentOrHistoryEntry;
    requireInt(entry.id, `${field}.id`);
    requireArray(entry.files ?? [], `${field}.files`, { maxLength: 100 });
    return entry;
}

export function registerPersonnelIpc(personnel: PersonnelService, logger: Logger): void {
    const view = access.any('personnel.view');

    handle(PERSONNEL_CHANNELS.list, view, () => personnel.list());

    handle(PERSONNEL_CHANNELS.getOne, view, (_event, id: unknown) =>
        personnel.getOne(requireInt(id, 'userId')),
    );

    handle(PERSONNEL_CHANNELS.listColumns, view, () => personnel.listColumns());

    handle(
        PERSONNEL_CHANNELS.create,
        access.any('personnel.create'),
        (_event, user: unknown) => personnel.create(requireObject(user, 'user')),
        { audit: 'personnel.create' },
    );

    handle(
        PERSONNEL_CHANNELS.update,
        access.any('personnel.edit'),
        async (_event, input: unknown) => {
            const user = requireObject(input, 'user');
            const id = requireInt(user.id, 'user.id');
            try {
                return await recoverFrom(
                    'NOT_FOUND',
                    () => personnel.update(id, user),
                    (error) => ({ success: false, message: error.message }),
                );
            } catch (err) {
                logger.warn(`update-user failed for #${id}`, err);
                return { success: false, message: String(err) };
            }
        },
        { audit: 'personnel.update' },
    );

    handle(
        PERSONNEL_CHANNELS.remove,
        access.any('personnel.delete'),
        async (_event, input: unknown) => {
            const id = requireInt(input, 'userId');
            try {
                return await personnel.remove(id);
            } catch (err) {
                logger.warn(`delete-user failed for #${id}`, err);
                return false;
            }
        },
        { audit: 'personnel.delete' },
    );

    /** Assigning staff positions to many people at once (Штатні посади). */
    handle(
        PERSONNEL_CHANNELS.bulkUpdateAssignments,
        access.any('personnel.edit'),
        async (_event, input: unknown) => {
            const assignments = requireArray<Assignment>(input, 'users', { maxLength: 20_000 });
            try {
                for (const assignment of assignments) requireInt(assignment?.id, 'user.id');
                await personnel.bulkUpdateAssignments(assignments);
                return { success: true };
            } catch (err) {
                logger.error('bulkUpdateUsers failed', err);
                return { success: false, error: (err as Error).message };
            }
        },
        { audit: 'personnel.bulk-update' },
    );
}

export function registerHistoryIpc(history: HistoryService): void {
    const view = access.any('personnel.view');
    const edit = access.any('history.edit');

    handle(HISTORY_CHANNELS.list, view, (_event, userId: unknown, filter: unknown) =>
        history.list(
            requireInt(userId, 'userId'),
            requireString(filter, 'filter', { maxLength: 20, allowEmpty: true }),
        ),
    );

    handle(HISTORY_CHANNELS.listByRange, view, (_event, userId: unknown, range: unknown) =>
        history.listByRange(
            requireInt(userId, 'userId'),
            requireOneOf(range, 'range', HISTORY_RANGES),
        ),
    );

    handle(HISTORY_CHANNELS.findIncomplete, view, () => history.findIncomplete());
    handle(HISTORY_CHANNELS.statusPeriods, view, () => history.statusPeriods());

    handle(
        HISTORY_CHANNELS.loadFile,
        view,
        (_event, userId: unknown, entryId: unknown, fileName: unknown) =>
            history.loadFile(
                requireInt(userId, 'userId'),
                requireInt(entryId, 'entryId'),
                requireString(fileName, 'filename', { maxLength: 260 }),
            ),
    );

    // Status changes, orders and position moves add history as part of editing a person.
    handle(
        HISTORY_CHANNELS.add,
        access.any('history.edit', 'personnel.edit'),
        (_event, userId: unknown, entry: unknown) => {
            const id = requireInt(userId, 'userId');
            const newEntry = requireEntry(entry, 'entry');
            return toStatus(() => history.add(id, newEntry));
        },
        { audit: 'history.add' },
    );

    handle(
        HISTORY_CHANNELS.edit,
        edit,
        (_event, userId: unknown, entry: unknown) => {
            const id = requireInt(userId, 'userId');
            const updated = requireEntry(entry, 'entry');
            return toStatus(() => history.edit(id, updated));
        },
        { audit: 'history.edit' },
    );

    handle(
        HISTORY_CHANNELS.remove,
        edit,
        (_event, entryId: unknown) => {
            const id = requireInt(entryId, 'historyId');
            return recoverFrom(
                'NOT_FOUND',
                async () => ({ success: true, deletedFromUserId: await history.remove(id) }),
                (error) => ({ success: false, message: error.message }),
            );
        },
        { audit: 'history.delete' },
    );
}

export function registerCommentIpc(comments: CommentService): void {
    const edit = access.any('history.edit');

    handle(COMMENT_CHANNELS.list, access.any('personnel.view'), (_event, userId: unknown) =>
        comments.list(requireInt(userId, 'userId')),
    );

    handle(
        COMMENT_CHANNELS.add,
        edit,
        (_event, userId: unknown, comment: unknown) => {
            const id = requireInt(userId, 'userId');
            const entry = requireObject(comment, 'comment') as unknown as CommentOrHistoryEntry;
            requireInt(entry.id, 'comment.id');
            return toStatus(() => comments.add(id, entry));
        },
        { audit: 'comments.add' },
    );

    handle(
        COMMENT_CHANNELS.remove,
        edit,
        async (_event, commentId: unknown) => {
            await comments.remove(requireInt(commentId, 'id'));
            return true;
        },
        { audit: 'comments.delete' },
    );
}
