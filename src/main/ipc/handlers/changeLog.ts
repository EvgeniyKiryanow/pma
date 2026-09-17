import type { Db } from '../../db/types';

/**
 * Appends an entry to `change_history` (used by the change-log export for offline exchange).
 * Shared by all legacy handlers so the format is defined once.
 */
export async function logChange(
    db: Db,
    table: string,
    recordId: number | string,
    operation: 'insert' | 'update' | 'delete',
    data: unknown,
): Promise<void> {
    await db.run(
        `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
         VALUES (?, ?, ?, ?, 'local')`,
        table,
        recordId,
        operation,
        JSON.stringify(data),
    );
}
