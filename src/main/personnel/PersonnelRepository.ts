import type { DbProvider } from '../db/types';
import { USER_WRITABLE_FIELDS } from './userFields';

export type UserRow = Record<string, any> & { id: number };

/** JSON array columns of `users` that hold entries (history, comments). */
export type EntryListField = 'history' | 'comments';

/**
 * History and comments change only through their own channels. A full-row update used to
 * write them too, and callers holding the personnel list (loaded without them) wiped both.
 */
export const USER_UPDATE_FIELDS = USER_WRITABLE_FIELDS.filter(
    (field) => field !== 'history' && field !== 'comments',
);

/** Fields set when people are assigned to staff positions in bulk. */
export const ASSIGNMENT_FIELDS = [
    'position',
    'unitMain',
    'category',
    'shpkCode',
    'shpkNumber',
] as const;

export type Assignment = { id: number } & Partial<
    Record<(typeof ASSIGNMENT_FIELDS)[number], unknown>
>;

const INSERT_SQL = `INSERT INTO users (${USER_WRITABLE_FIELDS.join(', ')})
    VALUES (${USER_WRITABLE_FIELDS.map(() => '?').join(', ')})`;

const UPDATE_SQL = `UPDATE users SET ${USER_UPDATE_FIELDS.map((f) => `${f} = ?`).join(', ')}
    WHERE id = ?`;

const ASSIGNMENT_SQL = `UPDATE users SET ${ASSIGNMENT_FIELDS.map((f) => `${f} = ?`).join(', ')}
    WHERE id = ?`;

/** SQL for the `users` table (personnel). Column lists come from code, never from input. */
export class PersonnelRepository {
    constructor(private readonly db: DbProvider) {}

    async list(): Promise<UserRow[]> {
        return (await this.db()).all<UserRow[]>('SELECT * FROM users');
    }

    async findById(id: number): Promise<UserRow | undefined> {
        return (await this.db()).get<UserRow>('SELECT * FROM users WHERE id = ?', id);
    }

    async exists(id: number): Promise<boolean> {
        return Boolean(
            await (await this.db()).get('SELECT 1 AS found FROM users WHERE id = ?', id),
        );
    }

    /** `values` are in the order of USER_WRITABLE_FIELDS (see `userToRow`). */
    async insert(values: unknown[]): Promise<number> {
        const result = await (await this.db()).run(INSERT_SQL, values);
        return Number(result.lastID);
    }

    /** `values` are in the order of USER_UPDATE_FIELDS. */
    async update(id: number, values: unknown[]): Promise<void> {
        await (await this.db()).run(UPDATE_SQL, [...values, id]);
    }

    /** Returns false when there is no such person. */
    async updateAssignment(assignment: Assignment): Promise<boolean> {
        const values = ASSIGNMENT_FIELDS.map((field) => assignment[field]);
        const result = await (await this.db()).run(ASSIGNMENT_SQL, [...values, assignment.id]);
        return Boolean(result.changes);
    }

    async delete(id: number): Promise<void> {
        await (await this.db()).run('DELETE FROM users WHERE id = ?', id);
    }

    async columnNames(): Promise<string[]> {
        const columns = await (
            await this.db()
        ).all<{ name: string }[]>(`PRAGMA table_info(users);`);
        return columns.map((column) => column.name);
    }

    /** Raw JSON of one entry list; `undefined` when there is no such person. */
    async readEntryList(
        id: number,
        field: EntryListField,
    ): Promise<{ value: string | null } | undefined> {
        return (await this.db()).get(`SELECT ${field} AS value FROM users WHERE id = ?`, id);
    }

    async writeEntryList(id: number, field: EntryListField, json: string): Promise<void> {
        await (await this.db()).run(`UPDATE users SET ${field} = ? WHERE id = ?`, json, id);
    }

    async listEntryLists(
        field: EntryListField,
    ): Promise<{ id: number; shpkNumber: string | null; value: string | null }[]> {
        return (await this.db()).all(`SELECT id, shpkNumber, ${field} AS value FROM users`);
    }
}
