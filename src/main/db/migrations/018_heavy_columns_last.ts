import type { Migration } from './types';

/** Columns that can be megabytes per person; the personnel list never reads them. */
const HEAVY = ['history', 'comments', 'photo'];

/**
 * SQLite reads the columns of a row in order. `history`, `comments` and `photo` sat in the
 * middle of `users` (the card columns were added after them), so reading the personnel list
 * walked through every person's whole history and photo just to reach the columns behind
 * them. Rebuilt with those three at the end, the list reads only what it shows.
 *
 * Same procedure as migration 6: identical column definitions, the row count checked before
 * the old table goes, indexes and triggers recreated from their stored definitions, and the
 * AUTOINCREMENT counter kept (an id of a deleted person is never given again).
 */
export const heavyColumnsLast: Migration = {
    version: 18,
    name: 'heavy-columns-last',
    verifyForeignKeys: ['user_history', 'comments'],
    async up(db) {
        const columns: {
            name: string;
            type: string;
            dflt_value: string | null;
            notnull: number;
            pk: number;
        }[] = await db.all(`PRAGMA table_info(users)`);
        const present = HEAVY.filter((name) => columns.some((column) => column.name === name));
        const tail = columns.slice(columns.length - present.length).map((column) => column.name);
        if (present.every((name, index) => tail[index] === name)) return;

        const ordered = [
            ...columns.filter((column) => !HEAVY.includes(column.name)),
            ...present.map((name) => columns.find((column) => column.name === name)!),
        ];
        const definition = (column: (typeof columns)[number]) => {
            if (column.pk === 1) return `"${column.name}" INTEGER PRIMARY KEY AUTOINCREMENT`;
            const type = column.type || 'TEXT';
            const notNull = column.notnull ? ' NOT NULL' : '';
            const fallback = column.dflt_value !== null ? ` DEFAULT ${column.dflt_value}` : '';
            return `"${column.name}" ${type}${notNull}${fallback}`;
        };
        const names = ordered.map((column) => `"${column.name}"`).join(', ');

        const before = await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM users`);
        const sequence = await db.get<{ seq: number }>(
            `SELECT seq FROM sqlite_sequence WHERE name = 'users'`,
        );
        const objects: { sql: string | null }[] = await db.all(
            `SELECT sql FROM sqlite_master
             WHERE tbl_name = 'users' AND type IN ('index', 'trigger') AND sql IS NOT NULL`,
        );

        await db.exec(`CREATE TABLE users_rebuilt (${ordered.map(definition).join(', ')})`);
        await db.run(`INSERT INTO users_rebuilt (${names}) SELECT ${names} FROM users`);
        const copied = await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM users_rebuilt`);
        if ((copied?.n ?? -1) !== (before?.n ?? -2)) {
            throw new Error(`Rebuild of users copied ${copied?.n} of ${before?.n} rows`);
        }

        // Triggers of other tables name `users` (migration 14): a modern RENAME checks them
        // while `users` does not exist for a moment. The legacy mode renames only the table.
        await db.exec(`DROP TABLE users`);
        await db.exec('PRAGMA legacy_alter_table = ON');
        try {
            await db.exec(`ALTER TABLE users_rebuilt RENAME TO users`);
        } finally {
            await db.exec('PRAGMA legacy_alter_table = OFF');
        }
        if (sequence) {
            await db.run(
                `UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'users'`,
                sequence.seq,
            );
            await db.run(
                `INSERT INTO sqlite_sequence (name, seq)
                 SELECT 'users', ? WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'users')`,
                sequence.seq,
            );
        }
        for (const object of objects) await db.exec(object.sql as string);
    },
};
