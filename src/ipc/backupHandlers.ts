import { ipcMain, dialog, app, autoUpdater } from 'electron';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

import { getDb, getDbPath } from '../database/db';
import {
    getBackupIntervalInDays,
    setBackupIntervalInDays,
    startScheduledBackup,
} from '../backupScheduler';

export function registerBackupHandlers() {
    ipcMain.handle('backup:set-interval', async (_event, days: number) => {
        await setBackupIntervalInDays(days);
        return true;
    });

    ipcMain.handle('backup:get-interval', async () => {
        return await getBackupIntervalInDays();
    });

    ipcMain.handle('get-user-data-path', () => {
        return app.getPath('userData');
    });

    ipcMain.handle('backup:get-backup-path', () => {
        const backupDir = path.join(process.cwd(), 'auto-backups');
        return backupDir;
    });

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

            // Step 1: Save existing auth_user
            const currentDb = await open({ filename: dbPath, driver: sqlite3.Database });
            const existingAuthUsers = await currentDb.all('SELECT * FROM auth_user');

            // Step 2: Overwrite DB with backup
            await fs.copyFile(backupPath, dbPath);

            // Step 3: Open the new DB
            const newDb = await open({ filename: dbPath, driver: sqlite3.Database });

            // Step 4: Check if we should restore old auth_user
            const hadLocalUser = existingAuthUsers.length > 0;
            if (hadLocalUser) {
                // Remove auth_user from backup DB
                await newDb.exec('DELETE FROM auth_user');

                // Insert only the local user(s)
                for (const user of existingAuthUsers) {
                    await newDb.run(
                        `INSERT INTO auth_user (id, username, password, recovery_hint) VALUES (?, ?, ?, ?)`,
                        user.id,
                        user.username,
                        user.password,
                        user.recovery_hint ?? null,
                    );
                }
            }

            return true;
        } catch (error) {
            console.error('❌ Error during restore-db:', error);
            return false;
        }
    });

    ipcMain.handle('reset-db', async () => {
        try {
            const db = await getDb();

            await db.exec('DELETE FROM auth_user;');
            await db.exec('DELETE FROM users;');
            console.log('Database tables cleared successfully.');

            return true;
        } catch (err) {
            console.error('Failed to reset DB:', err);
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
    ipcMain.handle('check-for-updates', async () => {
        try {
            const result = await autoUpdater.checkForUpdates();
            return { status: 'ok', info: result };
        } catch (err: any) {
            return { status: 'error', message: err?.message || 'Unknown error' };
        }
    });

    ipcMain.handle('install-update', () => {
        autoUpdater.quitAndInstall();
    });

    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    // 🔁 Start backup schedule on app load
    getBackupIntervalInDays().then(startScheduledBackup);
}
