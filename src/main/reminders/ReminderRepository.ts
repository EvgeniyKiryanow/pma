import type { Reminder } from '../../shared/types/reminder';
import type { DbProvider } from '../db/types';

export class ReminderRepository {
    constructor(private readonly db: DbProvider) {}

    async list(): Promise<Reminder[]> {
        return (await this.db()).all<Reminder[]>('SELECT * FROM todos ORDER BY id DESC');
    }

    async findById(id: number): Promise<Reminder | undefined> {
        return (await this.db()).get<Reminder>('SELECT * FROM todos WHERE id = ?', id);
    }

    async insert(content: string): Promise<number> {
        const result = await (
            await this.db()
        ).run('INSERT INTO todos (content, completed) VALUES (?, 0)', content);
        return Number(result.lastID);
    }

    async toggle(id: number): Promise<void> {
        await (await this.db()).run('UPDATE todos SET completed = NOT completed WHERE id = ?', id);
    }

    async delete(id: number): Promise<void> {
        await (await this.db()).run('DELETE FROM todos WHERE id = ?', id);
    }
}
