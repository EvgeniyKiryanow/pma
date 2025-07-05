import { open } from "sqlite";
import sqlite3 from "sqlite3";
import path from "path";
import { app } from "electron";

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

    relatives TEXT,  -- JSON.stringify(RelativeContact[])
    comments TEXT,   -- JSON.stringify(CommentOrHistoryEntry[])
    history TEXT     -- JSON.stringify(CommentOrHistoryEntry[])
);

    `);
}
