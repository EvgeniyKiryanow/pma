import { app } from 'electron';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { getDb } from '../../database/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const adminIdPath = path.join(app.getPath('userData'), 'admin_id');

let DEFAULT_ADMIN_KEY = '';

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

export async function ensureDefaultAdmin() {
    const db = await getDb();

    await db.exec(`
        CREATE TABLE IF NOT EXISTS default_admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            recovery_hint TEXT,
            key TEXT NOT NULL
        );
    `);

    const existing = await db.get(`SELECT * FROM default_admin WHERE username = 'admin'`);

    if (!existing) {
        const hashed = await bcrypt.hash('admin123', 10);
        const adminKey = await getDefaultAdminKey();

        await db.run(
            `INSERT INTO default_admin (username, password, recovery_hint, key)
             VALUES (?, ?, ?, ?)`,
            'admin',
            hashed,
            'Default admin account',
            adminKey,
        );

        console.log(`✅ Default admin created with key: ${adminKey}`);
    } else {
        console.log('ℹ️ Default admin already exists');
    }
}
