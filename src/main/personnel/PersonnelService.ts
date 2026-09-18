import { AppError } from '../../shared/ipc/result';
import type { User } from '../../shared/types/user';
import type { Transactor } from '../db/types';
import type { ChangeJournal } from '../sync/ChangeJournal';
import {
    type Assignment,
    type PersonnelRepository,
    USER_UPDATE_FIELDS,
    type UserRow,
} from './PersonnelRepository';
import { parseUserRow, userToRow } from './userFields';

const toUser = (row: UserRow) => parseUserRow(row) as unknown as User;

/** Personnel records (особовий склад). */
export class PersonnelService {
    constructor(
        private readonly transactor: Transactor,
        private readonly people: PersonnelRepository,
        private readonly journal: ChangeJournal,
    ) {}

    /** Everyone, without the heavy history/comments JSON. */
    async list(): Promise<User[]> {
        return (await this.people.list()).map(
            ({ history: _history, comments: _comments, ...rest }) =>
                parseUserRow(rest, ['relatives']) as unknown as User,
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

    /** Updates everything except history and comments. Throws NOT_FOUND. */
    async update(id: number, user: Record<string, unknown>): Promise<User> {
        return this.transactor.transaction(async () => {
            if (!(await this.people.exists(id))) throw new AppError('NOT_FOUND', 'User not found');
            await this.people.update(id, userToRow(user, USER_UPDATE_FIELDS));
            await this.journal.recordRow('users', id, 'update');
            return toUser(await this.people.findById(id));
        });
    }

    /** Returns false when there is no such person. */
    async remove(id: number): Promise<boolean> {
        return this.transactor.transaction(async () => {
            const row = await this.people.findById(id);
            if (!row) return false;
            await this.people.delete(id);
            await this.journal.record('users', id, 'delete', row);
            return true;
        });
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
