import type { DbProvider } from '../db/types';

/**
 * Tables whose changes travel between computers in a change log. An imported log may only
 * touch these; anything else in the file is ignored.
 */
export const SYNCABLE_TABLES = [
    'users',
    'user_history',
    'comments',
    'todos',
    'report_templates',
    'shtatni_posady',
    'named_list_tables',
    'user_directives',
    'award_types',
    'journal_entries',
    'document_categories',
    'person_documents',
] as const;

export type SyncableTable = (typeof SYNCABLE_TABLES)[number];

export type ChangeOperation = 'insert' | 'update' | 'delete';

/** A file carried by an exported change (only inside the .pmc, never in the journal). */
export type ChangeFile = {
    /** Which folder: a person's document, a journal entry, an award, a history entry. */
    kind: 'document' | 'journal' | 'award' | 'history';
    /** uuid of the document / journal entry, id of the award record / history entry. */
    key: string;
    name: string;
    dataUrl: string;
};

export type ChangeRow = {
    id?: number;
    table_name: string;
    record_id: number | string;
    operation: ChangeOperation;
    data: unknown;
    timestamp?: string;
    files?: ChangeFile[];
};

/**
 * Local journal of data changes (`change_history`), exported as a `.pmc` file for offline
 * exchange. Every feature that changes syncable data writes through here, inside the same
 * transaction as the change itself, so the journal never disagrees with the data.
 */
export class ChangeJournal {
    constructor(private readonly db: DbProvider) {}

    async record(
        table: SyncableTable,
        recordId: number | string,
        operation: ChangeOperation,
        data: unknown,
    ): Promise<void> {
        const db = await this.db();
        const json = JSON.stringify(data);
        if (operation !== 'delete') {
            // Every change carries the whole row, so a newer one makes the waiting one useless:
            // it is refreshed in place (keeping its place in the order, an insert stays an
            // insert). Without this every history entry added a copy of the person's entire
            // history to the journal, and the file grew without bound until the next export.
            const waiting = await db.get<{ id: number; operation: string }>(
                `SELECT id, operation FROM change_history
                 WHERE table_name = ? AND record_id = ? AND (source_id IS NULL OR source_id = 'local')
                 ORDER BY id DESC LIMIT 1`,
                table,
                recordId,
            );
            if (waiting && waiting.operation !== 'delete') {
                await db.run(
                    `UPDATE change_history SET data = ?, timestamp = CURRENT_TIMESTAMP WHERE id = ?`,
                    json,
                    waiting.id,
                );
                return;
            }
        }
        await db.run(
            `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, 'local')`,
            table,
            recordId,
            operation,
            json,
        );
    }

    /** Records an insert or update with the full current row, as the importer expects. */
    async recordRow(
        table: SyncableTable,
        id: number,
        operation: Exclude<ChangeOperation, 'delete'>,
    ): Promise<void> {
        const row = await (await this.db()).get(`SELECT * FROM "${table}" WHERE id = ?`, id);
        await this.record(table, id, operation, row);
    }

    /** Records an insert or update of the row with this uuid (tables keyed by uuid). */
    async recordByUuid(
        table: SyncableTable,
        uuid: string,
        operation: Exclude<ChangeOperation, 'delete'>,
    ): Promise<void> {
        const row = await (await this.db()).get(`SELECT * FROM "${table}" WHERE uuid = ?`, uuid);
        if (row) await this.record(table, row.id, operation, row);
    }

    /** Changes made on this computer that have not been exported yet, oldest first. */
    async pendingLocal(): Promise<ChangeRow[]> {
        return (await this.db()).all<ChangeRow[]>(
            `SELECT * FROM change_history WHERE source_id IS NULL OR source_id = 'local' ORDER BY id ASC`,
        );
    }

    /**
     * Drops the entries written to an export file — unless one was refreshed with newer data
     * while the file was being written: that one waits for the next export.
     */
    async removeExported(changes: ChangeRow[]): Promise<void> {
        const db = await this.db();
        for (const change of changes) {
            await db.run(
                `DELETE FROM change_history
                 WHERE id = ? AND data IS ? AND (source_id IS NULL OR source_id = 'local')`,
                change.id,
                change.data,
            );
        }
    }
}
