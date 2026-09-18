import { RENAMED_STATUSES, STATUS_COLUMNS } from '../../../shared/helpers/statusNames';
import type { Db } from '../types';
import type { Migration } from './types';

async function hasColumn(db: Db, table: string, column: string): Promise<boolean> {
    const columns = await db.all<{ name: string }[]>(`PRAGMA table_info("${table}")`);
    return columns.some((c) => c.name === column);
}

/**
 * Corrected status names («Бронєгрупа» → «Бронегрупа»): the status and the previous status of
 * every person, and the same word in the texts of their history records («Статус змінено з
 * "Бронєгрупа"…»), so a search finds every record. Nothing else changes.
 */
export const statusNames: Migration = {
    version: 8,
    name: 'status-names',
    async up(db) {
        for (const [oldName, newName] of Object.entries(RENAMED_STATUSES)) {
            for (const column of STATUS_COLUMNS) {
                if (!(await hasColumn(db, 'users', column))) continue;
                await db.run(
                    `UPDATE users SET "${column}" = ? WHERE "${column}" = ?`,
                    newName,
                    oldName,
                );
            }
            if (await hasColumn(db, 'users', 'history')) {
                await db.run(
                    `UPDATE users SET history = REPLACE(history, ?, ?) WHERE instr(history, ?) > 0`,
                    oldName,
                    newName,
                    oldName,
                );
            }
            for (const column of ['description', 'content']) {
                if (!(await hasColumn(db, 'user_history', column))) continue;
                await db.run(
                    `UPDATE user_history SET "${column}" = REPLACE("${column}", ?, ?) WHERE instr("${column}", ?) > 0`,
                    oldName,
                    newName,
                    oldName,
                );
            }
        }
    },
};
