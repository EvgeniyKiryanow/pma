import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import { existsSync, rmSync, readdirSync, unlinkSync } from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { resetUserTemplates } from '../main';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';

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

            const currentDb = await open({ filename: dbPath, driver: sqlite3.Database });
            const existingAuthUsers = await currentDb.all('SELECT * FROM auth_user');

            await fs.copyFile(backupPath, dbPath);

            const newDb = await open({ filename: dbPath, driver: sqlite3.Database });

            const hadLocalUser = existingAuthUsers.length > 0;
            if (hadLocalUser) {
                await newDb.exec('DELETE FROM auth_user');

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

            // Clear all relevant tables
            await db.exec('DELETE FROM auth_user;');
            await db.exec('DELETE FROM users;');
            await db.exec('DELETE FROM todos;');
            await db.exec('DELETE FROM comments;');
            await db.exec('DELETE FROM report_templates;');

            // Delete all report files from disk
            const reportsDir = path.join(app.getPath('userData'), 'reports');
            if (existsSync(reportsDir)) {
                const files = readdirSync(reportsDir);
                for (const file of files) {
                    const fullPath = path.join(reportsDir, file);
                    unlinkSync(fullPath);
                }
            }

            resetUserTemplates();
            console.log('✅ Database and report templates fully reset.');
            return true;
        } catch (err) {
            console.error('❌ Failed to reset DB:', err);
            return false;
        }
    });

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
            const updateInfo = await autoUpdater.checkForUpdates();
            log.info('ℹ️ Manual checkForUpdates result', updateInfo);

            return { status: 'ok', info: updateInfo.updateInfo };
        } catch (err: any) {
            log.error('❌ Manual checkForUpdates failed:', err);
            return {
                status: 'error',
                message: err?.message || 'Unknown update error',
            };
        }
    });

    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    ipcMain.handle('close-app', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (win) win.close();
    });

    ipcMain.handle('hide-app', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return;

        if (process.platform === 'darwin') {
            app.hide(); // macOS → Cmd+H
        } else {
            win.minimize(); // Windows/Linux → minimize
        }
    });

    getBackupIntervalInDays().then(startScheduledBackup);
}
