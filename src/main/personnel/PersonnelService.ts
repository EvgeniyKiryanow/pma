import { AppError } from '../../shared/ipc/result';
import type { User } from '../../shared/types/user';
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

/** Lists added in v2.1: screens and imports that do not know them must not empty them. */
const KEPT_LISTS = ['educationList', 'awardRecords'] as const;

const toUser = (row: UserRow) => parseUserRow(row) as unknown as User;

/** Personnel records (особовий склад). */
export class PersonnelService {
    constructor(
        private readonly transactor: Transactor,
        private readonly people: PersonnelRepository,
        private readonly journal: ChangeJournal,
        /** Documents of a deleted person must not stay on disk without their owner. */
        private readonly attachments?: Pick<HistoryAttachments, 'removePerson'>,
    ) {}

    /** Everyone, without the heavy history/comments JSON. */
    async list(): Promise<User[]> {
        return (await this.people.list()).map(
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
            const id = await this.people.insert(userToRow(user));
            await this.journal.recordRow('users', id, 'insert');
            return toUser(await this.people.findById(id));
        });
    }

    /**
     * Updates everything except history and comments. The lists of the card (education,
     * awards) stay as they are when the caller does not send them. Throws NOT_FOUND.
     */
    async update(id: number, user: Record<string, unknown>): Promise<User> {
        return this.transactor.transaction(async () => {
            const current = await this.people.findById(id);
            if (!current) throw new AppError('NOT_FOUND', 'User not found');
            const complete: Record<string, unknown> = { ...user };
            for (const field of KEPT_LISTS) {
                if (!(field in user)) complete[field] = safeJsonArray(current[field]);
            }
            await this.people.update(id, userToRow(complete, USER_UPDATE_FIELDS));
            await this.journal.recordRow('users', id, 'update');
            return toUser(await this.people.findById(id));
        });
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
