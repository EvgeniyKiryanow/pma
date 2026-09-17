import { database } from '../../db/connection';
import type { Db } from '../../db/types';
import { access, handle } from '../secureHandle';
import { logChange } from './changeLog';

const DIRECTIVE_TYPES = new Set(['order', 'exclude', 'restore']);

function assertType(type: string): void {
    if (!DIRECTIVE_TYPES.has(type)) throw new Error(`Unknown directive type: ${type}`);
}

async function deleteAndLog(db: Db, where: string, params: unknown[]): Promise<void> {
    const rows = await db.all(`SELECT * FROM user_directives WHERE ${where}`, params);
    if (!rows.length) return;
    await db.run(`DELETE FROM user_directives WHERE ${where}`, params);
    for (const row of rows) await logChange(db, 'user_directives', row.id, 'delete', row);
}

/** Orders (розпорядження), exclusions (виключення) and restorations (відновлення). */
export function registerDirectivesHandler() {
    const edit = access.any('directives.edit');

    handle(
        'directives:add',
        edit,
        async (_event, entry) => {
            assertType(entry?.type);
            await database.transaction(async (db) => {
                const res = await db.run(
                    `INSERT INTO user_directives (userId, type, title, description, file, period_from, period_to, date)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    entry.userId,
                    entry.type,
                    entry.title,
                    entry.description || '',
                    JSON.stringify(entry.file),
                    entry.period?.from || '',
                    entry.period?.to || '',
                    entry.date,
                );
                const inserted = await db.get(
                    'SELECT * FROM user_directives WHERE id = ?',
                    res.lastID,
                );
                await logChange(db, 'user_directives', Number(res.lastID), 'insert', inserted);
            });
        },
        { audit: 'directives.add' },
    );

    handle(
        'directives:deleteById',
        edit,
        (_event, id: number) => database.transaction((db) => deleteAndLog(db, 'id = ?', [id])),
        { audit: 'directives.delete' },
    );

    handle(
        'directives:delete',
        edit,
        (_event, { userId, date }) =>
            database.transaction((db) =>
                deleteAndLog(db, 'userId = ? AND date = ?', [userId, date]),
            ),
        { audit: 'directives.delete' },
    );

    handle(
        'directives:clearByType',
        edit,
        (_event, type: string) => {
            assertType(type);
            return database.transaction((db) => deleteAndLog(db, 'type = ?', [type]));
        },
        { audit: 'directives.clear-type' },
    );

    handle(
        'directives:getAllByType',
        access.any('directives.view'),
        async (_event, type: string) => {
            assertType(type);
            const db = await database.get();
            const rows = await db.all(
                `SELECT * FROM user_directives WHERE type = ? ORDER BY date DESC`,
                type,
            );
            return rows.map((row: any) => ({
                id: row.id,
                userId: row.userId,
                type: row.type,
                title: row.title,
                description: row.description,
                file: row.file ? safeParse(row.file) : null,
                date: row.date,
                period: { from: row.period_from || '', to: row.period_to || '' },
            }));
        },
    );
}

function safeParse(value: string): unknown {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}
