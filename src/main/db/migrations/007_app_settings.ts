import { SQL_NOW_ISO } from './helpers';
import type { Migration } from './types';

/**
 * Settings that belong to the data set rather than to one computer: the security policy
 * (idle lock) and the unit details printed on documents. Kept in the database so a full
 * backup carries them to another computer and a reset removes them — before this they lived
 * in the browser storage of the window, which neither backups nor resets touched.
 *
 * Keys are the identity (the same key on every computer), values are JSON.
 */
export const appSettings: Migration = {
    version: 7,
    name: 'app-settings',
    async up(db) {
        await db.exec(`
            CREATE TABLE app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (${SQL_NOW_ISO})
            );
        `);
    },
};
