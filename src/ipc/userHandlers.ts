import { ipcMain } from 'electron';
import { getDb } from '../database/db';
import dayjs from 'dayjs';
import { CommentOrHistoryEntry } from 'src/types/user';

export function registerUserHandlers() {
    // Fetch all users
    ipcMain.handle('fetch-users', async () => {
        const db = await getDb();
        const rows = await db.all('SELECT * FROM users');
        return rows.map((u: any) => ({
            ...u,
            relatives: JSON.parse(u.relatives || '[]'),
            comments: JSON.parse(u.comments || '[]'),
            history: JSON.parse(u.history || '[]'),
        }));
    });

    // Add user
    ipcMain.handle('add-user', async (_event, user) => {
        const db = await getDb();
        const stmt = await db.prepare(`
      INSERT INTO users (
        fullName, photo, phoneNumber, email, dateOfBirth,
        position, rank, rights, conscriptionInfo, notes,
        relatives, comments, history
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = await stmt.run(
            user.fullName,
            user.photo,
            user.phoneNumber,
            user.email,
            user.dateOfBirth,
            user.position,
            user.rank,
            user.rights,
            user.conscriptionInfo,
            user.notes,
            JSON.stringify(user.relatives || []),
            JSON.stringify(user.comments || []),
            JSON.stringify(user.history || []),
        );
        const inserted = await db.get('SELECT * FROM users WHERE id = ?', result.lastID);
        return {
            ...inserted,
            relatives: JSON.parse(inserted.relatives || '[]'),
            comments: JSON.parse(inserted.comments || '[]'),
            history: JSON.parse(inserted.history || '[]'),
        };
    });

    // Update user
    ipcMain.handle('update-user', async (_event, user) => {
        const db = await getDb();
        await db.run(
            `
      UPDATE users SET
        fullName = ?, photo = ?, phoneNumber = ?, email = ?, dateOfBirth = ?,
        position = ?, rank = ?, rights = ?, conscriptionInfo = ?, notes = ?,
        relatives = ?, comments = ?, history = ?
      WHERE id = ?
    `,
            user.fullName,
            user.photo,
            user.phoneNumber,
            user.email,
            user.dateOfBirth,
            user.position,
            user.rank,
            user.rights,
            user.conscriptionInfo,
            user.notes,
            JSON.stringify(user.relatives || []),
            JSON.stringify(user.comments || []),
            JSON.stringify(user.history || []),
            user.id,
        );
        return user;
    });

    // Delete user
    ipcMain.handle('delete-user', async (_event, userId: number) => {
        const db = await getDb();
        await db.run('DELETE FROM users WHERE id = ?', userId);
        return true;
    });

    ipcMain.handle('history:get-user-history', async (_event, userId: number, filter: string) => {
        const db = await getDb();

        const user = await db.get('SELECT history FROM users WHERE id = ?', userId);
        if (!user || !user.history) return [];

        const history: CommentOrHistoryEntry[] = JSON.parse(user.history);

        const fromDate = getFilterDate(filter); // returns date N days ago
        return history.filter((entry) => new Date(entry.date) >= fromDate);
    });
    ipcMain.handle('history:add-entry', async (_event, userId: number, newEntry: any) => {
        const db = await getDb();
        const user = await db.get(`SELECT history FROM users WHERE id = ?`, userId);

        const existingHistory = user?.history ? JSON.parse(user.history) : [];

        existingHistory.push(newEntry);

        await db.run(
            `UPDATE users SET history = ? WHERE id = ?`,
            JSON.stringify(existingHistory),
            userId,
        );
        return { success: true };
    });
    ipcMain.handle('deleteUserHistory', async (_, id: number) => {
        const db = await getDb();
        const users = await db.all('SELECT id, history FROM users');
        for (const user of users) {
            const history = JSON.parse(user.history || '[]');
            const updated = history.filter((item: any) => item.id !== id);
            if (updated.length !== history.length) {
                await db.run(
                    'UPDATE users SET history = ? WHERE id = ?',
                    JSON.stringify(updated),
                    user.id,
                );
            }
        }
        return true;
    });
}
export function getFilterDate(filter: string): Date {
    const now = new Date();
    const map: Record<string, number> = {
        '1day': 1,
        '7days': 7,
        '14days': 14,
        '30days': 30,
        all: 100 * 365, // basically no limit
    };

    const days = map[filter] ?? 30;
    now.setDate(now.getDate() - days);
    return now;
}
