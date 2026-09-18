import type { Db } from '../types';

export async function tableExists(db: Db, table: string): Promise<boolean> {
    const row = await db.get(
        `SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ?`,
        table,
    );
    return Boolean(row);
}

export async function columnNames(db: Db, table: string): Promise<Set<string>> {
    const rows: { name: string }[] = await db.all(`PRAGMA table_info("${table}")`);
    return new Set(rows.map((r) => r.name));
}

/** Adds each missing column. `columns` maps column name to its type/constraint clause. */
export async function addMissingColumns(
    db: Db,
    table: string,
    columns: Record<string, string>,
): Promise<string[]> {
    const existing = await columnNames(db, table);
    const added: string[] = [];
    for (const [name, definition] of Object.entries(columns)) {
        if (existing.has(name)) continue;
        await db.exec(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${definition}`);
        added.push(name);
    }
    return added;
}

/** SQL expression producing an RFC 4122 v4 UUID (evaluated per row). */
export const SQL_UUID_V4 = `lower(
    hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' ||
    substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))
)`;

/** SQL expression for the current UTC time in ISO-8601 with milliseconds. */
export const SQL_NOW_ISO = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;
