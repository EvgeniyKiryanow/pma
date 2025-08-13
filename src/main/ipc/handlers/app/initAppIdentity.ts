import { randomUUID } from 'crypto';
import { app } from 'electron';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';

import { getDb } from '../../../../database/db';

const keyFilePath = path.join(app.getPath('userData'), 'app_id');

export async function ensureAppIdentity(): Promise<string> {
    const db = await getDb();

    await db.exec(`
        CREATE TABLE IF NOT EXISTS app_identity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL
        );
    `);

    const existing = await db.get(`SELECT key FROM app_identity LIMIT 1`);
    if (existing?.key) {
        return existing.key;
    }

    const newKey = randomUUID();
    await db.run(`INSERT INTO app_identity (key) VALUES (?)`, newKey);
    await persistAppKeyToFile(newKey);

    console.log(`✅ App identity created: ${newKey}`);
    return newKey;
}

async function persistAppKeyToFile(key: string) {
    if (!existsSync(keyFilePath)) {
        await fs.writeFile(keyFilePath, key, 'utf-8');
    }
}
