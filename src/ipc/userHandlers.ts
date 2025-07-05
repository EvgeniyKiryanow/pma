import { ipcMain } from 'electron';
import { getDb } from '../database/db';

export function registerUserHandlers() {
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
}
