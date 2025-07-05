import { ipcMain, dialog } from 'electron';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

import { getDbPath } from '../database/db';

export function registerBackupHandlers() {
    // 🔁 BACKUP CURRENT DATABASE
    ipcMain.handle('download-db', async () => {
        try {
            const dbPath = await getDbPath();

            if (!existsSync(dbPath)) {
                console.error('DB file not found:', dbPath);
                return false;
            }

            const { canceled, filePath } = await dialog.showSaveDialog({
                title: 'Save Database Backup',
                defaultPath: 'backup.sqlite',
                filters: [{ name: 'SQLite DB', extensions: ['sqlite', 'db'] }],
            });

            if (canceled || !filePath) return false;

            await fs.copyFile(dbPath, filePath);
            return true;
        } catch (error) {
            console.error('Backup error:', error);
            return false;
        }
    });

    // 🔁 RESTORE DATABASE FROM BACKUP
    ipcMain.handle('restore-db', async () => {
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog({
                title: 'Select Backup File',
                filters: [{ name: 'SQLite DB', extensions: ['sqlite', 'db'] }],
                properties: ['openFile'],
            });

            if (canceled || filePaths.length === 0) return false;

            const backupPath = filePaths[0];
            const dbPath = await getDbPath();

            await fs.copyFile(backupPath, dbPath);
            return true;
        } catch (error) {
            console.error('Error restoring DB:', error);
            return false;
        }
    });

    // 🔁 REPLACE EXISTING DATABASE WITH ANOTHER FILE
    ipcMain.handle('replace-db', async () => {
        try {
            const dbPath = await getDbPath();

            const { canceled, filePaths } = await dialog.showOpenDialog({
                title: 'Select New Database File',
                filters: [{ name: 'SQLite DB', extensions: ['sqlite', 'db'] }],
                properties: ['openFile'],
            });

            if (canceled || filePaths.length === 0) return false;

            const selectedFile = filePaths[0];

            // Optional: create backup before overwrite
            if (existsSync(dbPath)) {
                const backupPath = dbPath + '.bak';
                await fs.copyFile(dbPath, backupPath);
                console.log('Backup created:', backupPath);
            }

            await fs.copyFile(selectedFile, dbPath);
            console.log('Database replaced with:', selectedFile);

            return true;
        } catch (error) {
            console.error('Replace DB error:', error);
            return false;
        }
    });
}
