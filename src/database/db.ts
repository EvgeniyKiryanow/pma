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

    // ⚙️ Критичні PRAGMA для стабільності/швидкості (викликаються один раз на старт)
    await db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA synchronous=NORMAL;
      PRAGMA foreign_keys=ON;
      PRAGMA busy_timeout=5000;
      PRAGMA temp_store=MEMORY;
    `);

    await db.exec(`
  CREATE TABLE IF NOT EXISTS shtatni_posady (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shtat_number TEXT UNIQUE NOT NULL,  -- номер по штату (const ID)
    unit_name TEXT,                     -- підрозділ
    position_name TEXT,                 -- посада
    category TEXT,                      -- кат
    shpk_code TEXT,                     -- ШПК
    extra_data TEXT                     -- JSON for other Excel columns
  );
`);

    await db.exec(`
CREATE TABLE IF NOT EXISTS named_list_tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,             -- e.g. "2025-08"
    data TEXT NOT NULL                    -- JSON.stringify of the full table
);
`);

    await db.exec(`
  CREATE TABLE IF NOT EXISTS default_admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    recovery_hint TEXT,
    key TEXT NOT NULL
  );
`);

    const defaultAdminColumns = await db.all(`PRAGMA table_info(default_admin)`);
    const hasAppKey = defaultAdminColumns.some((c: any) => c.name === 'app_key');
    if (!hasAppKey) {
        await db.exec(`ALTER TABLE default_admin ADD COLUMN app_key TEXT`);
    }

    await db.exec(`
    CREATE TABLE IF NOT EXISTS superuser (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        key TEXT NOT NULL
    );
`);

    await db.exec(`
    CREATE TABLE IF NOT EXISTS auth_user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    );
`);

    // Safe migration (ignore if already exists)
    try {
        await db.exec(`ALTER TABLE auth_user ADD COLUMN recovery_hint TEXT`);
    } catch (err) {
        if (!String(err).includes('duplicate column name')) throw err;
    }

    try {
        await db.exec(`ALTER TABLE auth_user ADD COLUMN role TEXT DEFAULT 'user'`);
    } catch (err) {
        if (!String(err).includes('duplicate column name')) throw err;
    }

    try {
        await db.exec(`ALTER TABLE auth_user ADD COLUMN key TEXT`);
    } catch (err) {
        if (!String(err).includes('duplicate column name')) throw err;
    }

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
            bloodType TEXT,
            soldierStatus TEXT
        );
    `);

    // Create other tables
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
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            author TEXT,
            content TEXT,
            type TEXT,
            date TEXT,
            files TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS report_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            filePath TEXT NOT NULL,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await db.exec(`
  CREATE TABLE IF NOT EXISTS user_directives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('order','exclude','restore')), -- 'order', 'exclude', 'restore'
    title TEXT NOT NULL,
    description TEXT,
    file TEXT,
    period_from TEXT,
    period_to TEXT,
    date TEXT NOT NULL
  );
`);

    await db.exec(`
  CREATE TABLE IF NOT EXISTS change_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    operation TEXT NOT NULL,
    data TEXT,
    source_id TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

    // 🔎 Індекси під часті запити
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_shpk ON users(shpkNumber);
      CREATE INDEX IF NOT EXISTS idx_users_unitMain ON users(unitMain);
      CREATE INDEX IF NOT EXISTS idx_users_soldierStatus ON users(soldierStatus);
      CREATE INDEX IF NOT EXISTS idx_hist_user_date ON user_history(userId, date);
      CREATE INDEX IF NOT EXISTS idx_ch_table_rec_time ON change_history(table_name, record_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_named_list_key ON named_list_tables(key);
    `);

    // ✅ Валідація JSON через тригери (бо CHECK на існуючих колонках не додати без перетворень)
    // users: relatives, comments, history
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_users_json_insert
      BEFORE INSERT ON users
      FOR EACH ROW
      BEGIN
        SELECT CASE WHEN NEW.relatives IS NOT NULL AND json_valid(NEW.relatives) = 0
          THEN RAISE(ABORT, 'Invalid JSON in users.relatives') END;
        SELECT CASE WHEN NEW.comments IS NOT NULL AND json_valid(NEW.comments) = 0
          THEN RAISE(ABORT, 'Invalid JSON in users.comments') END;
        SELECT CASE WHEN NEW.history IS NOT NULL AND json_valid(NEW.history) = 0
          THEN RAISE(ABORT, 'Invalid JSON in users.history') END;
      END;
    `);

    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_users_json_update
      BEFORE UPDATE ON users
      FOR EACH ROW
      BEGIN
        SELECT CASE WHEN NEW.relatives IS NOT NULL AND json_valid(NEW.relatives) = 0
          THEN RAISE(ABORT, 'Invalid JSON in users.relatives') END;
        SELECT CASE WHEN NEW.comments IS NOT NULL AND json_valid(NEW.comments) = 0
          THEN RAISE(ABORT, 'Invalid JSON in users.comments') END;
        SELECT CASE WHEN NEW.history IS NOT NULL AND json_valid(NEW.history) = 0
          THEN RAISE(ABORT, 'Invalid JSON in users.history') END;
      END;
    `);

    // named_list_tables: data має бути валідним JSON
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_named_list_json_insert
      BEFORE INSERT ON named_list_tables
      FOR EACH ROW
      BEGIN
        SELECT CASE WHEN NEW.data IS NOT NULL AND json_valid(NEW.data) = 0
          THEN RAISE(ABORT, 'Invalid JSON in named_list_tables.data') END;
      END;
    `);
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_named_list_json_update
      BEFORE UPDATE ON named_list_tables
      FOR EACH ROW
      BEGIN
        SELECT CASE WHEN NEW.data IS NOT NULL AND json_valid(NEW.data) = 0
          THEN RAISE(ABORT, 'Invalid JSON in named_list_tables.data') END;
      END;
    `);

    // ✅ Upgrade missing user columns
    const userColumns = await db.all(`PRAGMA table_info(users);`);
    const colNames = userColumns.map((c: any) => c.name);

    const requiredUserColumns: [string, string][] = [
        // existing extras
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

        // ✅ New hierarchy from Excel
        ['unitMain', 'TEXT'], // підрозділ
        ['unitLevel1', 'TEXT'], // підрозділ 1
        ['unitLevel2', 'TEXT'], // підрозділ 2
        ['platoon', 'TEXT'], // взвод
        ['squad', 'TEXT'], // відділення

        // ✅ Military specialization
        ['vosCode', 'TEXT'], // ВОС
        ['shpkCode', 'TEXT'], // ШПК
        ['shpkNumber', 'TEXT'], // ШПК номер
        ['category', 'TEXT'], // кат
        ['kshp', 'TEXT'], // КШП

        // ✅ Rank & appointment details
        ['rankAssignedBy', 'TEXT'], // Ким присвоєно, №наказу
        ['rankAssignmentDate', 'TEXT'], // Дата присвоєння
        ['appointmentOrder', 'TEXT'], // наказ на прийом/призначення
        ['previousStatus', 'TEXT'], // попередній статус

        // ✅ Personal details
        ['placeOfBirth', 'TEXT'], // Місце народження
        ['taxId', 'TEXT'], // ІПН
        ['serviceType', 'TEXT'], // Мобілізований чи контракт
        ['recruitmentOfficeDetails', 'TEXT'], // До якого ТЦК відноситься
        ['ubdStatus', 'TEXT'], // УБД
        ['childrenInfo', 'TEXT'], // ПІБ дітей та рік народження

        // ✅ Absence / status
        ['bzvpStatus', 'TEXT'], // БЗВП
        ['rvbzPresence', 'TEXT'], // наявність в РВБЗ
        ['absenceReason', 'TEXT'], // причина відсутності
        ['absenceFromDate', 'TEXT'], // дата з
        ['absenceToDate', 'TEXT'], // дата по

        // ✅ Subordination & gender
        ['subordination', 'TEXT'], // підпорядкування
        ['gender', 'TEXT'], // гендер
        // ✅ New fields from Excel
        ['personalPrisonFileExists', 'TEXT'], // Наявність особової справи
        ['tDotData', 'TEXT'], // т.
        ['positionNominative', 'TEXT'], // повна посада називний
        ['positionGenitive', 'TEXT'], // повна посада родовий
        ['positionDative', 'TEXT'], // повна посада давальний
        ['positionInstrumental', 'TEXT'], // повна посада орудний
        ['soldierStatus', 'TEXT'],
    ];

    for (const [colName, colType] of requiredUserColumns) {
        if (!colNames.includes(colName)) {
            await db.exec(`ALTER TABLE users ADD COLUMN ${colName} ${colType};`);
        }
    }

    // 🧹 (опціонально) VACUUM після великих міграцій
    // await db.exec('VACUUM');
}
