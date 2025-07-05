import { ipcMain, dialog } from 'electron';
import fs from 'fs';
import { getDbPath } from '../database/db';

export function registerBackupHandlers() {
    ipcMain.handle('download-db', async () => {
        const dbPath = await getDbPath();

        try {
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
}
