import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { getDbPath } from './database/db';

let backupInterval: NodeJS.Timeout | null = null;
const configPath = path.join(app.getPath('userData'), 'backup-config.json');

export async function setBackupIntervalInDays(days: number) {
    await fs.writeFile(configPath, JSON.stringify({ intervalDays: days }), 'utf-8');
    console.log(`[Auto Backup] Interval set to ${days} day(s)`);
    startScheduledBackup(days);
}

export async function getBackupIntervalInDays(): Promise<number> {
    try {
        const data = await fs.readFile(configPath, 'utf-8');
        const parsed = JSON.parse(data);
        return parsed.intervalDays || 1;
    } catch {
        return 1; // Default to 1 day
    }
}

export async function startScheduledBackup(initialDays?: number) {
    const days = initialDays || (await getBackupIntervalInDays());
    const ms = days * 24 * 60 * 60 * 1000;

    if (backupInterval) clearInterval(backupInterval);

    backupInterval = setInterval(async () => {
        try {
            const dbPath = await getDbPath();
            const backupDir = path.join(app.getPath('userData'), 'auto-backups');
            await fs.mkdir(backupDir, { recursive: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(backupDir, `backup-${timestamp}.sqlite`);

            await fs.copyFile(dbPath, backupFile);
            console.log('[Auto Backup] Saved to:', backupFile);
        } catch (error) {
            console.error('[Auto Backup Error]', error);
        }
    }, ms);

    console.log(`[Auto Backup] Started with interval: ${days} day(s)`);
}

export function stopScheduledBackup() {
    if (backupInterval) {
        clearInterval(backupInterval);
        backupInterval = null;
        console.log('[Auto Backup] Stopped');
    }
}
