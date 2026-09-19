import { AppError } from '../../shared/ipc/result';
import type { AwardFile, AwardRecord, User } from '../../shared/types/user';
import type { Transactor } from '../db/types';
import type { ChangeJournal } from '../sync/ChangeJournal';
import type { HistoryAttachments } from './HistoryAttachments';
import {
    type Assignment,
    type PersonnelRepository,
    USER_UPDATE_FIELDS,
    type UserRow,
} from './PersonnelRepository';
import { parseUserRow, safeJsonArray, userToRow } from './userFields';

type AwardFileStore = Pick<
    HistoryAttachments,
    'removePerson' | 'saveAwardFiles' | 'removeAwardFilesExcept'
>;

const awardList = (value: unknown): AwardRecord[] =>
    (Array.isArray(value) ? value : []).filter(
        (record): record is AwardRecord =>
            Boolean(record) && typeof record === 'object' && typeof record.id === 'string',
    );

/** Lists added in v2.1: screens and imports that do not know them must not empty them. */
const KEPT_LISTS = ['educationList', 'awardRecords'] as const;

const toUser = (row: UserRow) => parseUserRow(row) as unknown as User;

/** Personnel records (особовий склад). */
export class PersonnelService {
    constructor(
        private readonly transactor: Transactor,
        private readonly people: PersonnelRepository,
        private readonly journal: ChangeJournal,
        /** Documents of awards; a deleted person's documents must not stay on disk. */
        private readonly attachments?: AwardFileStore,
    ) {}

    /**
     * Writes the new documents of the awards (those that carry `dataUrl`) and returns the list
     * as the card stores it: names and sizes only. Throws if a file cannot be written.
     */
    private async storeAwardFiles(userId: number, records: AwardRecord[]): Promise<AwardRecord[]> {
        const result: AwardRecord[] = [];
        for (const record of records) {
            const files = Array.isArray(record.files) ? record.files : [];
            if (!files.length) {
                const { files: _none, ...rest } = record;
                result.push(rest);
                continue;
            }
            if (!/^[\w-]{1,64}$/.test(record.id)) throw new AppError('VALIDATION', 'award id');
            const stored: AwardFile[] = this.attachments
                ? await this.attachments.saveAwardFiles(userId, record.id, files)
                : files.map(({ name, type, size }) => ({ name, type, size }));
            result.push({ ...record, files: stored });
        }
        return result;
    }

    /** After a save: files and folders of awards that are no longer in the card go away. */
    private async dropRemovedAwardFiles(
        userId: number,
        before: AwardRecord[],
        after: AwardRecord[],
    ): Promise<void> {
        if (!this.attachments) return;
        const now = new Map(after.map((record) => [record.id, record]));
        for (const record of before) {
            if (!record.files?.length || !/^[\w-]{1,64}$/.test(record.id)) continue;
            await this.attachments.removeAwardFilesExcept(
                userId,
                record.id,
                now.get(record.id)?.files ?? [],
            );
        }
    }

    /** Everyone, without the heavy history/comments JSON and photos (lists show `photoThumb`). */
    async list(): Promise<User[]> {
        return (await this.people.listRoster()).map(
            ({ history: _history, comments: _comments, ...rest }) =>
                parseUserRow(rest, [
                    'relatives',
                    'educationList',
                    'awardRecords',
                ]) as unknown as User,
        );
    }

    async getOne(id: number): Promise<User | null> {
        const row = await this.people.findById(id);
        return row ? toUser(row) : null;
    }

    async create(user: Record<string, unknown>): Promise<User> {
        return this.transactor.transaction(async () => {
            const awards = awardList(user.awardRecords);
            const hasFiles = awards.some((record) => record.files?.length);
            // Files need the person's id: the row is written first without them.
            const id = await this.people.insert(
                userToRow(
                    hasFiles
                        ? { ...user, awardRecords: awards.map(({ files: _f, ...rest }) => rest) }
                        : user,
                ),
            );
            if (hasFiles) {
                const stored = await this.storeAwardFiles(id, awards);
                await this.people.update(
                    id,
                    userToRow({ ...user, awardRecords: stored }, USER_UPDATE_FIELDS),
                );
            }
            await this.journal.recordRow('users', id, 'insert');
            return toUser(await this.people.findById(id));
        });
    }

    /**
     * Updates everything except history and comments. The lists of the card (education,
     * awards) stay as they are when the caller does not send them. Throws NOT_FOUND.
     */
    async update(id: number, user: Record<string, unknown>): Promise<User> {
        let before: AwardRecord[] = [];
        let after: AwardRecord[] | null = null;
        const saved = await this.transactor.transaction(async () => {
            const current = await this.people.findById(id);
            if (!current) throw new AppError('NOT_FOUND', 'User not found');
            const complete: Record<string, unknown> = { ...user };
            for (const field of KEPT_LISTS) {
                if (!(field in user)) complete[field] = safeJsonArray(current[field]);
            }
            // A person taken from the list has no photo: saving it keeps the photo. A new
            // photo without its small copy gets one later (PhotoThumbnails).
            if (user.photo === undefined) {
                complete.photo = current.photo;
                complete.photoThumb = current.photoThumb;
            } else if (user.photoThumb === undefined) {
                complete.photoThumb = user.photo === current.photo ? current.photoThumb : null;
            }
            if ('awardRecords' in user) {
                before = awardList(safeJsonArray(current.awardRecords));
                after = await this.storeAwardFiles(id, awardList(user.awardRecords));
                complete.awardRecords = after;
            }
            await this.people.update(id, userToRow(complete, USER_UPDATE_FIELDS));
            await this.journal.recordRow('users', id, 'update');
            return toUser(await this.people.findById(id));
        });
        // Only once the card no longer lists them: a failed save keeps every document.
        if (after) await this.dropRemovedAwardFiles(id, before, after);
        return saved;
    }

    /** Returns false when there is no such person. Their attachments are deleted as well. */
    async remove(id: number): Promise<boolean> {
        const removed = await this.transactor.transaction(async () => {
            const row = await this.people.findById(id);
            if (!row) return false;
            await this.people.delete(id);
            await this.journal.record('users', id, 'delete', row);
            return true;
        });
        if (removed) await this.attachments?.removePerson(id);
        return removed;
    }

    /** Assigns staff positions to many people at once; all or nothing. */
    async bulkUpdateAssignments(assignments: Assignment[]): Promise<void> {
        await this.transactor.transaction(async () => {
            for (const assignment of assignments) {
                if (!(await this.people.updateAssignment(assignment))) continue;
                await this.journal.recordRow('users', assignment.id, 'update');
            }
        });
    }

    listColumns(): Promise<string[]> {
        return this.people.columnNames();
    }
}
