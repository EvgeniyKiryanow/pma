import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { app } from 'electron';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';

import { getDb } from '../../../../database/db';

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

    // 1) Створюємо таблицю, але без прив’язки до username
    await db.exec(`
        CREATE TABLE IF NOT EXISTS default_admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            recovery_hint TEXT,
            key TEXT NOT NULL,
            app_key TEXT
        );
    `);

    // 2) Тригер, що забороняє другий рядок (один-єдиний default_admin)
    await db.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_default_admin_singleton
        BEFORE INSERT ON default_admin
        FOR EACH ROW
        BEGIN
            SELECT
                CASE
                    WHEN (SELECT COUNT(*) FROM default_admin) >= 1
                    THEN RAISE(ABORT, 'default_admin must have exactly one row')
                END;
        END;
    `);

    // 3) Зчитуємо всі наявні рядки і зводимо до одного
    const rows = await db.all(`SELECT id, username, app_key FROM default_admin ORDER BY id ASC`);
    const appKey = await getAppKey();
    const adminKey = await getDefaultAdminKey();

    if (rows.length === 0) {
        // Немає жодного — створюємо дефолт
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
        return;
    }

    if (rows.length > 1) {
        // Є дублікати — залишаємо перший, інші видаляємо
        const keepId = rows[0].id;
        const idsToDelete = rows.slice(1).map((r: any) => r.id);
        if (idsToDelete.length) {
            await db.run(
                `DELETE FROM default_admin WHERE id IN (${idsToDelete.map(() => '?').join(',')})`,
                idsToDelete,
            );
            console.warn(`⚠️ Removed duplicate default_admin rows: ${idsToDelete.join(', ')}`);
        }
    }

    // 4) Переконуємось, що у єдиного рядка є app_key
    const only = await db.get(`SELECT id, app_key FROM default_admin ORDER BY id ASC LIMIT 1`);
    if (!only.app_key) {
        await db.run(`UPDATE default_admin SET app_key = ? WHERE id = ?`, appKey, only.id);
        console.log(`✅ App key set for existing default admin: ${appKey}`);
    } else {
        console.log('ℹ️ Default admin exists with app_key');
    }
}
