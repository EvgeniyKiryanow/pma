import type { Migration } from './types';

/**
 * Every change of a person used to carry all the files of their history and awards again,
 * as text inside the change log: a person with a thousand documents made every exchange
 * file gigabytes (and too big to write). The files a change log has already carried are
 * listed here and are not sent again. Local to this computer.
 */
export const exchangeSentFiles: Migration = {
    version: 17,
    name: 'exchange-sent-files',
    async up(db) {
        await db.exec(`
            CREATE TABLE exchange_sent_files (
                owner_uuid TEXT NOT NULL,
                kind TEXT NOT NULL,
                file_key TEXT NOT NULL,
                name TEXT NOT NULL,
                size INTEGER NOT NULL DEFAULT -1,
                sent_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                PRIMARY KEY (owner_uuid, kind, file_key, name, size)
            ) WITHOUT ROWID;
        `);
    },
};
