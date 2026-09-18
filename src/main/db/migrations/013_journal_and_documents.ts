import { SQL_NOW_ISO, SQL_UUID_V4, tableExists } from './helpers';
import type { Migration } from './types';

/** uuid + created_at/updated_at filled by triggers, as for every other record. */
function identity(table: string): string {
    return `
        CREATE UNIQUE INDEX ux_${table}_uuid ON ${table}(uuid);
        CREATE TRIGGER trg_${table}_identity_insert
        AFTER INSERT ON ${table}
        FOR EACH ROW
        WHEN NEW.uuid IS NULL OR NEW.created_at IS NULL OR NEW.updated_at IS NULL
        BEGIN
            UPDATE ${table} SET
                uuid = COALESCE(NEW.uuid, ${SQL_UUID_V4}),
                created_at = COALESCE(NEW.created_at, ${SQL_NOW_ISO}),
                updated_at = COALESCE(NEW.updated_at, ${SQL_NOW_ISO})
            WHERE rowid = NEW.rowid;
        END;
        CREATE TRIGGER trg_${table}_identity_update
        AFTER UPDATE ON ${table}
        FOR EACH ROW
        WHEN NEW.updated_at IS OLD.updated_at
        BEGIN
            UPDATE ${table} SET updated_at = ${SQL_NOW_ISO} WHERE rowid = NEW.rowid;
        END;`;
}

/**
 * The working journal (planner) and the documents of a person.
 *
 * - `journal_entries`: notes and tasks of the unit with a date, priority, category, pin and
 *   attached files; the old reminders (`todos`) move in as entries.
 * - `document_categories` / `person_documents`: the «Документи» of a card, sorted into
 *   categories the unit creates. The files themselves live encrypted in the data folder.
 *
 * Local to this computer (files do not travel in the change log); full backups carry them.
 */
export const journalAndDocuments: Migration = {
    version: 13,
    name: 'journal-and-documents',
    async up(db) {
        await db.exec(`
            CREATE TABLE journal_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                body TEXT NOT NULL DEFAULT '',
                due_date TEXT,
                due_time TEXT,
                priority TEXT NOT NULL DEFAULT 'normal',
                category TEXT NOT NULL DEFAULT '',
                done INTEGER NOT NULL DEFAULT 0,
                done_at TEXT,
                pinned INTEGER NOT NULL DEFAULT 0,
                files TEXT NOT NULL DEFAULT '[]',
                user_id INTEGER,
                uuid TEXT,
                created_at TEXT,
                updated_at TEXT
            );
            ${identity('journal_entries')}
            CREATE INDEX idx_journal_entries_due ON journal_entries(done, due_date);

            CREATE TABLE document_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                sort INTEGER NOT NULL DEFAULT 0,
                uuid TEXT,
                created_at TEXT,
                updated_at TEXT
            );
            ${identity('document_categories')}

            CREATE TABLE person_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                category_uuid TEXT,
                name TEXT NOT NULL,
                file_name TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT '',
                size INTEGER NOT NULL DEFAULT 0,
                note TEXT NOT NULL DEFAULT '',
                uuid TEXT,
                created_at TEXT,
                updated_at TEXT
            );
            ${identity('person_documents')}
            CREATE INDEX idx_person_documents_user ON person_documents(user_id);
            CREATE INDEX idx_person_documents_created ON person_documents(created_at);

            -- The folder of a deleted person goes with its files; the rows go here.
            CREATE TRIGGER trg_users_delete_documents
            AFTER DELETE ON users
            FOR EACH ROW
            BEGIN
                DELETE FROM person_documents WHERE user_id = OLD.id;
            END;
        `);

        const defaults = [
            'Паспорт та ІПН',
            'Військовий квиток',
            'Накази та витяги',
            'Медичні документи',
            'Посвідчення',
            'Рапорти',
            'Інше',
        ];
        for (const [index, name] of defaults.entries()) {
            await db.run(`INSERT INTO document_categories (name, sort) VALUES (?, ?)`, name, index);
        }

        // The old reminders become journal entries.
        if (await tableExists(db, 'todos')) {
            await db.exec(`
                INSERT INTO journal_entries (title, done, done_at, created_at)
                SELECT content, CASE WHEN completed THEN 1 ELSE 0 END,
                       CASE WHEN completed THEN COALESCE(updated_at, ${SQL_NOW_ISO}) END,
                       COALESCE(created_at, ${SQL_NOW_ISO})
                FROM todos WHERE trim(COALESCE(content, '')) <> '';
            `);
        }
    },
};
