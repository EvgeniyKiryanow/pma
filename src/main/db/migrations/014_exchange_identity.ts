import { addMissingColumns } from './helpers';
import type { Migration } from './types';

/** The categories every computer creates: the same uuid everywhere, so an exchange merges them. */
export const DEFAULT_DOCUMENT_CATEGORIES = [
    'Паспорт та ІПН',
    'Військовий квиток',
    'Накази та витяги',
    'Медичні документи',
    'Посвідчення',
    'Рапорти',
    'Інше',
].map((name, index) => ({
    name,
    uuid: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
}));

/**
 * Documents of people and journal entries travel in the change log. A person is local by id
 * on each computer, so the rows also carry the person's uuid (filled by triggers), and the
 * default categories get fixed uuids.
 */
export const exchangeIdentity: Migration = {
    version: 14,
    name: 'exchange-identity',
    async up(db) {
        for (const table of ['person_documents', 'journal_entries']) {
            await addMissingColumns(db, table, { user_uuid: 'TEXT' });
            await db.exec(`
                UPDATE ${table} SET user_uuid = (SELECT uuid FROM users WHERE users.id = ${table}.user_id)
                WHERE user_id IS NOT NULL;

                CREATE TRIGGER trg_${table}_user_uuid_insert
                AFTER INSERT ON ${table}
                FOR EACH ROW
                WHEN NEW.user_id IS NOT NULL AND NEW.user_uuid IS NULL
                BEGIN
                    UPDATE ${table} SET user_uuid = (SELECT uuid FROM users WHERE id = NEW.user_id)
                    WHERE rowid = NEW.rowid;
                END;

                CREATE TRIGGER trg_${table}_user_uuid_update
                AFTER UPDATE OF user_id ON ${table}
                FOR EACH ROW
                WHEN NEW.user_id IS NOT OLD.user_id
                BEGIN
                    UPDATE ${table} SET user_uuid = (SELECT uuid FROM users WHERE id = NEW.user_id)
                    WHERE rowid = NEW.rowid;
                END;
            `);
        }

        for (const category of DEFAULT_DOCUMENT_CATEGORIES) {
            const row = await db.get<{ uuid: string }>(
                `SELECT uuid FROM document_categories WHERE name = ? ORDER BY id LIMIT 1`,
                category.name,
            );
            if (!row || row.uuid === category.uuid) continue;
            await db.run(
                `UPDATE person_documents SET category_uuid = ? WHERE category_uuid = ?`,
                category.uuid,
                row.uuid,
            );
            await db.run(
                `UPDATE document_categories SET uuid = ? WHERE uuid = ?`,
                category.uuid,
                row.uuid,
            );
        }
    },
};
