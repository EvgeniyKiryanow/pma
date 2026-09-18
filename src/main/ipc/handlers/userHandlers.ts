import { createLogger } from '../../core/logger';
import { database } from '../../db/connection';
import { parseUserRow, USER_WRITABLE_FIELDS, userToRow } from '../../personnel/userFields';
import { access, handle } from '../secureHandle';
import { requireArray, requireInt, requireObject } from '../validate';
import { logChange } from './changeLog';

const logger = createLogger('personnel');

const INSERT_SQL = `INSERT INTO users (${USER_WRITABLE_FIELDS.join(', ')})
    VALUES (${USER_WRITABLE_FIELDS.map(() => '?').join(', ')})`;

/**
 * History and comments change only through their own channels. A full-row update used to
 * write them too, and callers holding the personnel list (loaded without them) wiped both.
 */
const UPDATE_FIELDS = USER_WRITABLE_FIELDS.filter((f) => f !== 'history' && f !== 'comments');

const UPDATE_SQL = `UPDATE users SET ${UPDATE_FIELDS.map((f) => `${f} = ?`).join(', ')}
    WHERE id = ?`;

export function registerUserHandlers() {
    handle(
        'add-user',
        access.any('personnel.create'),
        async (_event, userInput) => {
            const user = requireObject(userInput, 'user');
            return database.transaction(async (db) => {
                const result = await db.run(INSERT_SQL, userToRow(user));
                const inserted = await db.get('SELECT * FROM users WHERE id = ?', result.lastID);
                await logChange(db, 'users', Number(result.lastID), 'insert', inserted);
                return parseUserRow(inserted);
            });
        },
        { audit: 'personnel.create' },
    );

    handle(
        'update-user',
        access.any('personnel.edit'),
        async (_event, userInput) => {
            const user = requireObject(userInput, 'user');
            const userId = requireInt(user.id, 'user.id');
            try {
                return await database.transaction(async (db) => {
                    const existing = await db.get('SELECT id FROM users WHERE id = ?', userId);
                    if (!existing) return { success: false, message: 'User not found' };

                    await db.run(UPDATE_SQL, [...userToRow(user, UPDATE_FIELDS), userId]);
                    const updated = await db.get('SELECT * FROM users WHERE id = ?', userId);
                    await logChange(db, 'users', userId, 'update', updated);
                    return parseUserRow(updated);
                });
            } catch (err) {
                logger.warn(`update-user failed for #${user?.id}`, err);
                return { success: false, message: String(err) };
            }
        },
        { audit: 'personnel.update' },
    );

    handle(
        'delete-user',
        access.any('personnel.delete'),
        async (_event, userIdInput: number) => {
            const userId = requireInt(userIdInput, 'userId');
            try {
                return await database.transaction(async (db) => {
                    const user = await db.get('SELECT * FROM users WHERE id = ?', userId);
                    if (!user) return false;
                    await db.run('DELETE FROM users WHERE id = ?', userId);
                    await logChange(db, 'users', userId, 'delete', user);
                    return true;
                });
            } catch (err) {
                logger.warn(`delete-user failed for #${userId}`, err);
                return false;
            }
        },
        { audit: 'personnel.delete' },
    );

    /** Assigning staff positions to many people at once (Штатні посади). */
    handle(
        'bulkUpdateUsers',
        access.any('personnel.edit'),
        async (_event, updatedUsersInput: any[]) => {
            const updatedUsers = requireArray<any>(updatedUsersInput, 'users', { maxLength: 20_000 });
            try {
                await database.transaction(async (db) => {
                    for (const user of updatedUsers) {
                        requireInt(user?.id, 'user.id');
                        const res = await db.run(
                            `UPDATE users SET position = ?, unitMain = ?, category = ?, shpkCode = ?, shpkNumber = ?
                             WHERE id = ?`,
                            user.position,
                            user.unitMain,
                            user.category,
                            user.shpkCode,
                            user.shpkNumber,
                            user.id,
                        );
                        if (!res.changes) continue;
                        const updated = await db.get('SELECT * FROM users WHERE id = ?', user.id);
                        await logChange(db, 'users', user.id, 'update', updated);
                    }
                });
                return { success: true };
            } catch (err) {
                logger.error('bulkUpdateUsers failed', err);
                return { success: false, error: (err as Error).message };
            }
        },
        { audit: 'personnel.bulk-update' },
    );

    handle('users:get-db-columns', access.any('personnel.view'), async () => {
        const db = await database.get();
        const columns: { name: string }[] = await db.all(`PRAGMA table_info(users);`);
        return columns.map((c) => c.name);
    });
}
