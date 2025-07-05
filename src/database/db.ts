import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { app } from 'electron';

let dbInstance: any;

export async function getDbPath(): Promise<string> {
    // Wait until Electron is ready
    if (!app.isReady()) {
        await app.whenReady();
    }

    return path.join(app.getPath('userData'), 'users.db');
}

export async function getDb() {
    const dbPath = await getDbPath();
    if (!dbInstance) {
        dbInstance = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });
    }
    return dbInstance;
}
export async function initializeDb() {
    const db = await getDb();

    // Ensure auth_user table exists
    await db.exec(`
    CREATE TABLE IF NOT EXISTS auth_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `);

    // ✅ Check for recovery_hint and add if missing
    const columns = await db.all(`PRAGMA table_info(auth_user);`);
    const hasRecoveryHint = columns.some((col: any) => col.name === 'recovery_hint');

    if (!hasRecoveryHint) {
        await db.exec(`ALTER TABLE auth_user ADD COLUMN recovery_hint TEXT;`);
    }

    // Create users table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      photo TEXT,
      phoneNumber TEXT,
      email TEXT,
      dateOfBirth TEXT NOT NULL,
      position TEXT,
      rank TEXT,
      rights TEXT,
      conscriptionInfo TEXT,
      notes TEXT,
      relatives TEXT,
      comments TEXT,
      history TEXT
    );
  `);
}
