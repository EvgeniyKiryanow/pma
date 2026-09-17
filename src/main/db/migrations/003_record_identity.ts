import { addMissingColumns, SQL_NOW_ISO, SQL_UUID_V4, tableExists } from './helpers';
import type { Migration } from './types';

/**
 * Foundation for offline data exchange between installations:
 * every business record gets a globally unique `uuid` plus `created_at` / `updated_at`.
 *
 * Local integer ids stay as they are (the UI and existing code rely on them), but they are
 * only meaningful inside one database. Anything that moves records between computers
 * must match them by `uuid`.
 *
 * Triggers fill the columns, so existing INSERT/UPDATE statements keep working unchanged.
 * An UPDATE that explicitly sets `updated_at` (e.g. importing a change) keeps that value.
 */
export const IDENTITY_TABLES = [
    'users',
    'user_history',
    'comments',
    'todos',
    'report_templates',
    'shtatni_posady',
    'named_list_tables',
    'user_directives',
] as const;

export const recordIdentity: Migration = {
    version: 3,
    name: 'record-identity',
    async up(db) {
        for (const table of IDENTITY_TABLES) {
            if (!(await tableExists(db, table))) continue;

            await addMissingColumns(db, table, {
                uuid: 'TEXT',
                created_at: 'TEXT',
                updated_at: 'TEXT',
            });

            await db.exec(`
                UPDATE "${table}" SET uuid = ${SQL_UUID_V4} WHERE uuid IS NULL;
                UPDATE "${table}" SET created_at = ${SQL_NOW_ISO} WHERE created_at IS NULL;
                UPDATE "${table}" SET updated_at = COALESCE(created_at, ${SQL_NOW_ISO}) WHERE updated_at IS NULL;

                CREATE UNIQUE INDEX IF NOT EXISTS ux_${table}_uuid ON "${table}"(uuid);
                CREATE INDEX IF NOT EXISTS idx_${table}_updated_at ON "${table}"(updated_at);

                CREATE TRIGGER IF NOT EXISTS trg_${table}_identity_insert
                AFTER INSERT ON "${table}"
                FOR EACH ROW
                WHEN NEW.uuid IS NULL OR NEW.created_at IS NULL OR NEW.updated_at IS NULL
                BEGIN
                    UPDATE "${table}" SET
                        uuid = COALESCE(NEW.uuid, ${SQL_UUID_V4}),
                        created_at = COALESCE(NEW.created_at, ${SQL_NOW_ISO}),
                        updated_at = COALESCE(NEW.updated_at, ${SQL_NOW_ISO})
                    WHERE rowid = NEW.rowid;
                END;

                CREATE TRIGGER IF NOT EXISTS trg_${table}_identity_update
                AFTER UPDATE ON "${table}"
                FOR EACH ROW
                WHEN NEW.updated_at IS OLD.updated_at
                BEGIN
                    UPDATE "${table}" SET updated_at = ${SQL_NOW_ISO} WHERE rowid = NEW.rowid;
                END;
            `);
        }
    },
};
