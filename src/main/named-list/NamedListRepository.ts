import type { DbProvider } from '../db/types';

/** Stored as one JSON array per month (see docs: normalizing it is planned). */
export type NamedListRow = { key: string; data: string };

export class NamedListRepository {
    constructor(private readonly db: DbProvider) {}

    async list(): Promise<NamedListRow[]> {
        return (await this.db()).all<NamedListRow[]>(`SELECT key, data FROM named_list_tables`);
    }

    async find(key: string): Promise<NamedListRow | undefined> {
        return (await this.db()).get<NamedListRow>(
            `SELECT key, data FROM named_list_tables WHERE key = ?`,
            key,
        );
    }

    async insert(key: string, data: string): Promise<void> {
        await (
            await this.db()
        ).run(`INSERT INTO named_list_tables (key, data) VALUES (?, ?)`, key, data);
    }

    async update(key: string, data: string): Promise<void> {
        await (
            await this.db()
        ).run(`UPDATE named_list_tables SET data = ? WHERE key = ?`, data, key);
    }

    async delete(key: string): Promise<void> {
        await (await this.db()).run(`DELETE FROM named_list_tables WHERE key = ?`, key);
    }
}
