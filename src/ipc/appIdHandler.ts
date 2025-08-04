import { app, ipcMain } from 'electron';
import { getDb } from '../database/db';
import path from 'path';
import { readFile } from 'fs/promises';
import fs from 'fs';
import { exec } from 'child_process';

export function registerAppIdHandlers() {
    ipcMain.handle('app:get-key', async () => {
        const db = await getDb();
        const row = await db.get('SELECT key FROM app_identity LIMIT 1');
        return row?.key || null;
    });
}
