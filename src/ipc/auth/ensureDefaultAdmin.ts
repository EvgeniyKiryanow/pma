import { app } from 'electron';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { getDb } from '../../database/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const adminIdPath = path.join(app.getPath('userData'), 'admin_id');
const appKeyPath = path.join(app.getPath('userData'), 'app_key');

let DEFAULT_ADMIN_KEY = '';
let APP_KEY = '';

async function getDefaultAdminKey(): Promise<string> {
    if (DEFAULT_ADMIN_KEY) return DEFAULT_ADMIN_KEY;

    if (existsSync(adminIdPath)) {
        DEFAULT_ADMIN_KEY = await fs.readFile(adminIdPath, 'utf-8');
    } else {
        DEFAULT_ADMIN_KEY = randomUUID();
        await fs.writeFile(adminIdPath, DEFAULT_ADMIN_KEY);
    }

    return DEFAULT_ADMIN_KEY;
}

async function getAppKey(): Promise<string> {
    if (APP_KEY) return APP_KEY;

    if (existsSync(appKeyPath)) {
        APP_KEY = await fs.readFile(appKeyPath, 'utf-8');
    } else {
        APP_KEY = randomUUID();
        await fs.writeFile(appKeyPath, APP_KEY);
    }

    return APP_KEY;
}

export async function ensureDefaultAdmin() {
    const db = await getDb();

    // Ensure table and add 'app_key' column if missing
    await db.exec(`
        CREATE TABLE IF NOT EXISTS default_admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            recovery_hint TEXT,
            key TEXT NOT NULL
        );
    `);

    // Add app_key column if missing
    const columns = await db.all(`PRAGMA table_info(default_admin)`);
    const hasAppKey = columns.some((col: any) => col.name === 'app_key');

    if (!hasAppKey) {
        await db.exec(`ALTER TABLE default_admin ADD COLUMN app_key TEXT`);
    }

    // Get app_key and admin_key
    const appKey = await getAppKey();
    const adminKey = await getDefaultAdminKey();

    const existing = await db.get(`SELECT * FROM default_admin WHERE username = 'admin'`);

    if (!existing) {
        const hashed = await bcrypt.hash('admin123', 10);

        await db.run(
            `INSERT INTO default_admin (username, password, recovery_hint, key, app_key)
             VALUES (?, ?, ?, ?, ?)`,
            'admin',
            hashed,
            'Default admin account',
            adminKey,
            appKey,
        );

        console.log(`✅ Default admin created with key: ${adminKey}, app_key: ${appKey}`);
    } else if (!existing.app_key) {
        await db.run(`UPDATE default_admin SET app_key = ? WHERE id = ?`, appKey, existing.id);

        console.log(`✅ App key set for existing default admin: ${appKey}`);
    } else {
        console.log('ℹ️ Default admin already exists with app_key');
    }
}
