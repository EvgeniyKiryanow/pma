import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

import { getDb } from '../../../../database/db';

export async function ensureSuperuser() {
    const db = await getDb();

    // Create table if not exists
    await db.exec(`
        CREATE TABLE IF NOT EXISTS superuser (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            key TEXT NOT NULL
        );
    `);

    // Insert default superuser if not exists
    const existing = await db.get(`SELECT * FROM superuser WHERE username = 'superuser'`);

    if (!existing) {
        const hashed = await bcrypt.hash('masterpass2025', 10);
        await db.run(
            `INSERT INTO superuser (username, password, key) VALUES (?, ?, ?)`,
            'superuser',
            hashed,
            randomUUID(),
        );
        console.log('✅ Superuser created: username=superuser, password=masterpass2025');
    } else {
        console.log('ℹ️ Superuser already exists');
    }
}
