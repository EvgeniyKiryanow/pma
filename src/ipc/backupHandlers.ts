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
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
function encryptWithPassword(data: Buffer, password: string): Buffer {
    const iv = randomBytes(12);
    const key = Buffer.from(password.padEnd(32, ' '), 'utf8');
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]);
}

function decryptWithPassword(buffer: Buffer, password: string): Buffer {
    const iv = buffer.slice(0, 12);
    const tag = buffer.slice(12, 28);
    const encrypted = buffer.slice(28);

    const key = Buffer.from(password.padEnd(32, ' '), 'utf8');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

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

            // VACUUM to shrink database before export
            const tempDb = await open({ filename: dbPath, driver: sqlite3.Database });
            await tempDb.exec('VACUUM;');
            await tempDb.close();

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

    ipcMain.handle('download-db-safe', async (_event, password: string) => {
        try {
            const dbPath = await getDbPath();

            if (!existsSync(dbPath)) {
                console.error('🔴 DB file not found:', dbPath);
                return { success: false, error: 'db-missing' };
            }

            if (!password || password.length < 6) {
                console.warn('🔴 Пароль занадто короткий або не вказаний');
                return { success: false, error: 'short-password' };
            }

            // VACUUM before encryption
            const tempDb = await open({ filename: dbPath, driver: sqlite3.Database });
            await tempDb.exec('VACUUM;');
            await tempDb.close();

            const dbBuffer = await fs.readFile(dbPath);
            const encrypted = encryptWithPassword(dbBuffer, password);

            const { canceled, filePath } = await dialog.showSaveDialog({
                title: 'Export Encrypted Backup',
                defaultPath: 'backup_encrypted.pmb',
                filters: [{ name: 'Encrypted Backup', extensions: ['pmb'] }],
            });

            if (canceled || !filePath) return { success: false, error: 'canceled' };

            await fs.writeFile(filePath, encrypted);
            return { success: true };
        } catch (error) {
            console.error('🔴 Error exporting encrypted backup:', error);
            return { success: false, error: 'unknown' };
        }
    });

    ipcMain.handle('restore-db-safe', async (_event, password: string) => {
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog({
                title: 'Import Encrypted Backup',
                filters: [{ name: 'Encrypted Backup', extensions: ['pmb'] }],
                properties: ['openFile'],
            });

            if (canceled || filePaths.length === 0) return { success: false, error: 'canceled' };

            const encryptedBuffer = await fs.readFile(filePaths[0]);
            let decrypted: Buffer;
            try {
                decrypted = decryptWithPassword(encryptedBuffer, password);
            } catch {
                return { success: false, error: 'invalid-password' };
            }

            const dbPath = await getDbPath();
            const currentDb = await open({ filename: dbPath, driver: sqlite3.Database });
            const existingAuthUsers = await currentDb.all('SELECT * FROM auth_user');

            await fs.writeFile(dbPath, decrypted); // 💾 Replace with decrypted

            const newDb = await open({ filename: dbPath, driver: sqlite3.Database });
            if (existingAuthUsers.length > 0) {
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

            return { success: true };
        } catch (err) {
            console.error('🔴 Error during encrypted restore:', err);
            return { success: false, error: 'unknown' };
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
            await db.exec('DELETE FROM shtatni_posady;');
            await db.exec('DELETE FROM user_directives;');
            await db.exec('DELETE FROM change_history;');
            //change_history

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

    getBackupIntervalInDays().then(startScheduledBackup);
}
