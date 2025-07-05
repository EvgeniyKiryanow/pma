import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { getDbPath } from './database/db';

let backupInterval: NodeJS.Timeout | null = null;

const configPath = path.join(app.getPath('userData'), 'backup-config.json');
const metaPath = path.join(app.getPath('userData'), 'backup-meta.json');

export async function setBackupIntervalInDays(days: number) {
    await fs.writeFile(configPath, JSON.stringify({ intervalDays: days }), 'utf-8');
    console.log(`[Auto Backup] Interval set to ${days} day(s)`);
    await startScheduledBackup(days);
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

async function saveLastBackupTime(date = new Date()) {
    await fs.writeFile(metaPath, JSON.stringify({ lastBackup: date.toISOString() }), 'utf-8');
}

async function getLastBackupTime(): Promise<Date | null> {
    try {
        const data = await fs.readFile(metaPath, 'utf-8');
        const { lastBackup } = JSON.parse(data);
        return lastBackup ? new Date(lastBackup) : null;
    } catch {
        return null;
    }
}

async function performBackup() {
    try {
        const dbPath = await getDbPath();
        const backupDir = path.join(process.cwd(), 'auto-backups');
        await fs.mkdir(backupDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `backup-${timestamp}.sqlite`);

        await fs.copyFile(dbPath, backupFile);
        await saveLastBackupTime();

        console.log('[Auto Backup] Saved to:', backupFile);
    } catch (error) {
        console.error('[Auto Backup Error]', error);
    }
}

// export async function startScheduledBackup(initialDays?: number) {
//     const days = initialDays || (await getBackupIntervalInDays());
//     const ms = days * 24 * 60 * 60 * 1000;

//     // 🕒 Check for missed backup
//     const last = await getLastBackupTime();
//     const now = new Date();

//     if (!last || now.getTime() - last.getTime() >= ms) {
//         console.log('[Auto Backup] Missed backup detected. Running now...');
//         await performBackup();
//     }

//     // Start repeating interval
//     if (backupInterval) clearInterval(backupInterval);

//     backupInterval = setInterval(() => {
//         performBackup();
//     }, ms);

//     console.log(`[Auto Backup] Started with interval: ${days} day(s)`);
// }
export async function startScheduledBackup(initialDays?: number) {
    const days = initialDays || (await getBackupIntervalInDays());
    const ms = 60 * 1000; // 1 minute interval for testing

    // 🕒 Check for missed backup
    const last = await getLastBackupTime();
    const now = new Date();

    if (!last || now.getTime() - last.getTime() >= ms) {
        console.log('[Auto Backup] Missed or first backup detected. Running now...');
        await performBackup();
    }

    // Clear existing interval if any
    if (backupInterval) clearInterval(backupInterval);

    // Set repeating backup
    backupInterval = setInterval(() => {
        performBackup();
    }, ms);

    console.log(`[Auto Backup] Started with test interval: every ${ms / 1000} seconds`);
}

export function stopScheduledBackup() {
    if (backupInterval) {
        clearInterval(backupInterval);
        backupInterval = null;
        console.log('[Auto Backup] Stopped');
    }
}
