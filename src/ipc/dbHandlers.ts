import { ipcMain, dialog } from 'electron';
import fs from 'fs';
import { getDbPath, getDb } from '../database/db';

export function registerDbHandlers() {
    ipcMain.handle('download-db', async () => {
        try {
            const dbPath = getDbPath();
            if (!fs.existsSync(dbPath)) {
                console.error('DB file not found:', dbPath);
                return false;
            }

            const { canceled, filePath } = await dialog.showSaveDialog({
                title: 'Save Database Backup',
                defaultPath: 'backup.sqlite',
                filters: [{ name: 'SQLite DB', extensions: ['sqlite', 'db'] }],
            });

            if (canceled || !filePath) return false;

            await fs.promises.copyFile(dbPath, filePath);
            return true;
        } catch (error) {
            console.error('Backup error:', error);
            return false;
        }
    });

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
