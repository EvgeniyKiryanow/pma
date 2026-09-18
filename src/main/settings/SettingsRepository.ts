import type { DbProvider } from '../db/types';

/** Key → JSON value store in `app_settings`. */
export class SettingsRepository {
    constructor(private readonly db: DbProvider) {}

    async get(key: string): Promise<string | null> {
        const row = await (
            await this.db()
        ).get<{ value: string }>(`SELECT value FROM app_settings WHERE key = ?`, key);
        return row?.value ?? null;
    }

    async set(key: string, value: string): Promise<void> {
        await (
            await this.db()
        ).run(
            `INSERT INTO app_settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
            key,
            value,
        );
    }

    async remove(key: string): Promise<void> {
        await (await this.db()).run(`DELETE FROM app_settings WHERE key = ?`, key);
    }
}
