import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { app } from 'electron';

let dbInstance: any;

export async function getDbPath(): Promise<string> {
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

    // Create auth table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS auth_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `);

    const authColumns = await db.all(`PRAGMA table_info(auth_user);`);
    const hasRecoveryHint = authColumns.some((col: any) => col.name === 'recovery_hint');
    if (!hasRecoveryHint) {
        await db.exec(`ALTER TABLE auth_user ADD COLUMN recovery_hint TEXT;`);
    }

    // Create base users table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT,
      photo TEXT,
      phoneNumber TEXT,
      email TEXT,
      dateOfBirth TEXT,
      position TEXT,
      rank TEXT,
      rights TEXT,
      conscriptionInfo TEXT,
      notes TEXT,
      relatives TEXT,
      comments TEXT,
      history TEXT,
      education TEXT,
      awards TEXT,
      callsign TEXT,
      passportData TEXT,
      participantNumber TEXT,
      identificationNumber TEXT,
      fitnessCategory TEXT,
      unitNumber TEXT,
      hasCriminalRecord INTEGER,
      criminalRecordDetails TEXT,
      militaryTicketInfo TEXT,
      militaryServiceHistory TEXT,
      civilProfession TEXT,
      educationDetails TEXT,
      residenceAddress TEXT,
      registeredAddress TEXT,
      healthConditions TEXT,
      maritalStatus TEXT,
      familyInfo TEXT,
      religion TEXT,
      recruitingOffice TEXT,
      driverLicenses TEXT,
      bloodType TEXT
    );
  `);

    // Create user_history
    await db.exec(`
    CREATE TABLE IF NOT EXISTS user_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      date TEXT NOT NULL,
      author TEXT,
      type TEXT,
      content TEXT,
      description TEXT,
      files TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

    // Create comments
    await db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      author TEXT,
      content TEXT,
      type TEXT,
      date TEXT,
      files TEXT
    );
  `);

    // Create todos
    await db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Upgrade missing user columns
    const userColumns = await db.all(`PRAGMA table_info(users);`);
    const colNames = userColumns.map((c: any) => c.name);

    const requiredUserColumns: [string, string][] = [
        ['callsign', 'TEXT'],
        ['passportData', 'TEXT'],
        ['participantNumber', 'TEXT'],
        ['identificationNumber', 'TEXT'],
        ['fitnessCategory', 'TEXT'],
        ['unitNumber', 'TEXT'],
        ['hasCriminalRecord', 'INTEGER'],
        ['criminalRecordDetails', 'TEXT'],
        ['militaryTicketInfo', 'TEXT'],
        ['militaryServiceHistory', 'TEXT'],
        ['civilProfession', 'TEXT'],
        ['educationDetails', 'TEXT'],
        ['residenceAddress', 'TEXT'],
        ['registeredAddress', 'TEXT'],
        ['healthConditions', 'TEXT'],
        ['maritalStatus', 'TEXT'],
        ['familyInfo', 'TEXT'],
        ['religion', 'TEXT'],
        ['recruitingOffice', 'TEXT'],
        ['driverLicenses', 'TEXT'],
        ['bloodType', 'TEXT'],
        ['education', 'TEXT'],
        ['awards', 'TEXT'],
    ];

    for (const [colName, colType] of requiredUserColumns) {
        if (!colNames.includes(colName)) {
            await db.exec(`ALTER TABLE users ADD COLUMN ${colName} ${colType};`);
        }
    }
}
