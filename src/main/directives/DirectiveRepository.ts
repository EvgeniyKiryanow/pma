import type { DirectiveType } from '../../shared/types/directive';
import type { DbProvider } from '../db/types';

export type DirectiveRow = {
    id: number;
    uuid: string;
    userId: number;
    type: DirectiveType;
    title: string;
    description: string | null;
    file: string | null;
    period_from: string | null;
    period_to: string | null;
    date: string;
};

export type NewDirectiveRow = Omit<DirectiveRow, 'id' | 'uuid'>;

export class DirectiveRepository {
    constructor(private readonly db: DbProvider) {}

    async insert(row: NewDirectiveRow): Promise<number> {
        const result = await (
            await this.db()
        ).run(
            `INSERT INTO user_directives (userId, type, title, description, file, period_from, period_to, date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            row.userId,
            row.type,
            row.title,
            row.description,
            row.file,
            row.period_from,
            row.period_to,
            row.date,
        );
        return Number(result.lastID);
    }

    async listByType(type: DirectiveType): Promise<DirectiveRow[]> {
        return (await this.db()).all<DirectiveRow[]>(
            `SELECT * FROM user_directives WHERE type = ? ORDER BY date DESC`,
            type,
        );
    }

    async findById(id: number): Promise<DirectiveRow[]> {
        return (await this.db()).all<DirectiveRow[]>(
            `SELECT * FROM user_directives WHERE id = ?`,
            id,
        );
    }

    async findByUserAndDate(userId: number, date: string): Promise<DirectiveRow[]> {
        return (await this.db()).all<DirectiveRow[]>(
            `SELECT * FROM user_directives WHERE userId = ? AND date = ?`,
            userId,
            date,
        );
    }

    async delete(id: number): Promise<void> {
        await (await this.db()).run(`DELETE FROM user_directives WHERE id = ?`, id);
    }
}
