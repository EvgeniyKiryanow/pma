import bcrypt from 'bcryptjs';
import { getDb } from '../database/db';
import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import { existsSync, rmSync, readdirSync, unlinkSync } from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { resetUserTemplates } from '../main';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';

import { getDbPath } from '../database/db';
import {
    getBackupIntervalInDays,
    setBackupIntervalInDays,
    startScheduledBackup,
} from '../backupScheduler';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export function registerAppHandlers() {
    ipcMain.on('app:close', () => {
        if (process.platform === 'darwin') {
            app.exit(0);
        } else {
            app.quit();
        }
    });

    ipcMain.on('app:toggle-fullscreen', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
            win.setFullScreen(!win.isFullScreen());
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
}
