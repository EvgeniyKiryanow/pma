import type { DbProvider } from '../db/types';

/** A file of a person (history entry or award) carried by a change log. */
export type SentFile = {
    /** uuid of the person. */
    owner: string;
    kind: 'history' | 'award';
    /** Id of the history entry or of the award record. */
    key: string;
    name: string;
    /** Size written in the entry (-1 when unknown): a replaced file of the same name goes again. */
    size: number;
};

/** Files earlier change logs of this computer already carried (see migration 17). */
export class SentFiles {
    constructor(private readonly db: DbProvider) {}

    async has(file: SentFile): Promise<boolean> {
        const row = await (
            await this.db()
        ).get(
            `SELECT 1 AS found FROM exchange_sent_files
             WHERE owner_uuid = ? AND kind = ? AND file_key = ? AND name = ? AND size = ?`,
            file.owner,
            file.kind,
            file.key,
            file.name,
            file.size,
        );
        return Boolean(row);
    }

    /** Call in the transaction that drops the exported changes from the journal. */
    async remember(files: SentFile[]): Promise<void> {
        const db = await this.db();
        for (const file of files) {
            await db.run(
                `INSERT OR REPLACE INTO exchange_sent_files (owner_uuid, kind, file_key, name, size)
                 VALUES (?, ?, ?, ?, ?)`,
                file.owner,
                file.kind,
                file.key,
                file.name,
                file.size,
            );
        }
    }
}
