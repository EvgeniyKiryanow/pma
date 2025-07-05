import { ipcMain } from 'electron';
import { getDb } from '../database/db';

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
}
