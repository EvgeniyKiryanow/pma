import type { Migration } from './types';

/**
 * Databases created by early versions declared `users.fullName` and `users.dateOfBirth` as
 * NOT NULL, while later versions (and fresh installs) do not. The same action therefore
 * worked on one computer and failed with a raw SQLite error on another.
 *
 * This rebuilds `users` with the same columns and data but without NOT NULL on regular
 * columns, so every install behaves identically. Indexes and triggers are recreated from
 * their stored definitions; the row count is verified before the old table is dropped.
 */
export const relaxUserConstraints: Migration = {
    version: 6,
    name: 'relax-user-constraints',
    verifyForeignKeys: ['user_history', 'comments'],
    async up(db) {
        const columns: {
            name: string;
            type: string;
            notnull: number;
            dflt_value: string | null;
            pk: number;
        }[] = await db.all(`PRAGMA table_info(users)`);

        const constrained = columns.filter((column) => column.notnull === 1 && column.pk === 0);
        if (!constrained.length) return; // already relaxed (fresh installs)

        const definition = (column: (typeof columns)[number]) => {
            if (column.pk === 1) return `"${column.name}" INTEGER PRIMARY KEY AUTOINCREMENT`;
            const type = column.type || 'TEXT';
            const fallback = column.dflt_value !== null ? ` DEFAULT ${column.dflt_value}` : '';
            return `"${column.name}" ${type}${fallback}`;
        };

        const names = columns.map((column) => `"${column.name}"`).join(', ');
        const before = await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM users`);

        const objects: { type: string; name: string; sql: string | null }[] = await db.all(
            `SELECT type, name, sql FROM sqlite_master
             WHERE tbl_name = 'users' AND type IN ('index', 'trigger') AND sql IS NOT NULL`,
        );

        await db.exec(`CREATE TABLE users_rebuilt (${columns.map(definition).join(', ')})`);
        await db.run(`INSERT INTO users_rebuilt (${names}) SELECT ${names} FROM users`);

        const copied = await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM users_rebuilt`);
        if ((copied?.n ?? -1) !== (before?.n ?? -2)) {
            throw new Error(`Rebuild of users copied ${copied?.n} of ${before?.n} rows`);
        }

        await db.exec(`DROP TABLE users`);
        await db.exec(`ALTER TABLE users_rebuilt RENAME TO users`);

        // Indexes and triggers went away with the old table: recreate them as they were.
        for (const object of objects) {
            await db.exec(object.sql as string);
        }
    },
};
