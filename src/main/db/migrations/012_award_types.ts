import { SQL_NOW_ISO, SQL_UUID_V4 } from './helpers';
import type { Migration } from './types';

/**
 * The unit's own register of awards (brigade, battalion, local, public…). Cards refer to an
 * award of the register as `custom:<uuid>`, so the uuid is its identity on every computer.
 */
export const awardTypes: Migration = {
    version: 12,
    name: 'award-types',
    async up(db) {
        await db.exec(`
            CREATE TABLE award_types (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                kind TEXT NOT NULL DEFAULT 'medal',
                awarded_by TEXT NOT NULL DEFAULT '',
                degrees TEXT NOT NULL DEFAULT '[]',
                established TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                retired INTEGER NOT NULL DEFAULT 0,
                uuid TEXT,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE UNIQUE INDEX ux_award_types_uuid ON award_types(uuid);
            CREATE INDEX idx_award_types_updated_at ON award_types(updated_at);

            CREATE TRIGGER trg_award_types_identity_insert
            AFTER INSERT ON award_types
            FOR EACH ROW
            WHEN NEW.uuid IS NULL OR NEW.created_at IS NULL OR NEW.updated_at IS NULL
            BEGIN
                UPDATE award_types SET
                    uuid = COALESCE(NEW.uuid, ${SQL_UUID_V4}),
                    created_at = COALESCE(NEW.created_at, ${SQL_NOW_ISO}),
                    updated_at = COALESCE(NEW.updated_at, ${SQL_NOW_ISO})
                WHERE rowid = NEW.rowid;
            END;

            CREATE TRIGGER trg_award_types_identity_update
            AFTER UPDATE ON award_types
            FOR EACH ROW
            WHEN NEW.updated_at IS OLD.updated_at
            BEGIN
                UPDATE award_types SET updated_at = ${SQL_NOW_ISO} WHERE rowid = NEW.rowid;
            END;
        `);
    },
};
