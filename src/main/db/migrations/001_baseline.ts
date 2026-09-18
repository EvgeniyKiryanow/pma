import { addMissingColumns } from './helpers';
import type { Migration } from './types';

/**
 * Brings any database created by v1.0–v1.6 (or an empty file) to one known schema.
 * Every statement is idempotent because legacy installs are in many different states.
 * Schema previously lived in db.ts, migrations.ts and main.ts; it is consolidated here.
 */

const USER_COLUMNS: Record<string, string> = {
    fullName: 'TEXT',
    photo: 'TEXT',
    phoneNumber: 'TEXT',
    email: 'TEXT',
    dateOfBirth: 'TEXT',
    position: 'TEXT',
    rank: 'TEXT',
    rights: 'TEXT',
    conscriptionInfo: 'TEXT',
    notes: 'TEXT',
    relatives: 'TEXT',
    comments: 'TEXT',
    history: 'TEXT',
    education: 'TEXT',
    awards: 'TEXT',
    callsign: 'TEXT',
    passportData: 'TEXT',
    participantNumber: 'TEXT',
    identificationNumber: 'TEXT',
    fitnessCategory: 'TEXT',
    unitNumber: 'TEXT',
    hasCriminalRecord: 'INTEGER',
    criminalRecordDetails: 'TEXT',
    militaryTicketInfo: 'TEXT',
    militaryServiceHistory: 'TEXT',
    civilProfession: 'TEXT',
    educationDetails: 'TEXT',
    residenceAddress: 'TEXT',
    registeredAddress: 'TEXT',
    healthConditions: 'TEXT',
    maritalStatus: 'TEXT',
    familyInfo: 'TEXT',
    religion: 'TEXT',
    recruitingOffice: 'TEXT',
    driverLicenses: 'TEXT',
    bloodType: 'TEXT',
    soldierStatus: 'TEXT',
    // unit hierarchy (Excel import)
    unitMain: 'TEXT',
    unitLevel1: 'TEXT',
    unitLevel2: 'TEXT',
    platoon: 'TEXT',
    squad: 'TEXT',
    // military specialization
    vosCode: 'TEXT',
    shpkCode: 'TEXT',
    shpkNumber: 'TEXT',
    category: 'TEXT',
    kshp: 'TEXT',
    // rank & appointment
    rankAssignedBy: 'TEXT',
    rankAssignmentDate: 'TEXT',
    appointmentOrder: 'TEXT',
    previousStatus: 'TEXT',
    // personal details
    placeOfBirth: 'TEXT',
    taxId: 'TEXT',
    serviceType: 'TEXT',
    recruitmentOfficeDetails: 'TEXT',
    ubdStatus: 'TEXT',
    childrenInfo: 'TEXT',
    // absence / status
    bzvpStatus: 'TEXT',
    rvbzPresence: 'TEXT',
    absenceReason: 'TEXT',
    absenceFromDate: 'TEXT',
    absenceToDate: 'TEXT',
    subordination: 'TEXT',
    gender: 'TEXT',
    personalPrisonFileExists: 'TEXT',
    tDotData: 'TEXT',
    positionNominative: 'TEXT',
    positionGenitive: 'TEXT',
    positionDative: 'TEXT',
    positionInstrumental: 'TEXT',
};

export const baseline: Migration = {
    version: 1,
    name: 'baseline',
    async up(db) {
        const userColumnsSql = Object.entries(USER_COLUMNS)
            .map(([name, type]) => `"${name}" ${type}`)
            .join(',\n');

        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ${userColumnsSql}
            );
        `);
        await addMissingColumns(db, 'users', USER_COLUMNS);

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
                period_from TEXT,
                period_to TEXT,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            );

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

            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                completed INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS report_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                filePath TEXT NOT NULL,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS shtatni_posady (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                shtat_number TEXT UNIQUE NOT NULL,
                unit_name TEXT,
                position_name TEXT,
                category TEXT,
                shpk_code TEXT,
                extra_data TEXT
            );

            CREATE TABLE IF NOT EXISTS named_list_tables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL UNIQUE,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_directives (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('order', 'exclude', 'restore')),
                title TEXT NOT NULL,
                description TEXT,
                file TEXT,
                period_from TEXT,
                period_to TEXT,
                date TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS change_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name TEXT NOT NULL,
                record_id INTEGER NOT NULL,
                operation TEXT NOT NULL,
                data TEXT,
                source_id TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS app_identity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL
            );
        `);

        await addMissingColumns(db, 'user_history', { period_from: 'TEXT', period_to: 'TEXT' });

        // Indexes are created after all columns exist (v1.6 crashed on fresh installs here).
        await db.exec(`
            CREATE INDEX IF NOT EXISTS idx_users_shpk ON users(shpkNumber);
            CREATE INDEX IF NOT EXISTS idx_users_unitMain ON users(unitMain);
            CREATE INDEX IF NOT EXISTS idx_users_soldierStatus ON users(soldierStatus);
            CREATE INDEX IF NOT EXISTS idx_hist_user_date ON user_history(userId, date);
            CREATE INDEX IF NOT EXISTS idx_ch_table_rec_time ON change_history(table_name, record_id, timestamp);
            CREATE INDEX IF NOT EXISTS idx_directives_type_date ON user_directives(type, date);
        `);

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

            CREATE TRIGGER IF NOT EXISTS trg_named_list_json_insert
            BEFORE INSERT ON named_list_tables
            FOR EACH ROW
            BEGIN
                SELECT CASE WHEN NEW.data IS NOT NULL AND json_valid(NEW.data) = 0
                    THEN RAISE(ABORT, 'Invalid JSON in named_list_tables.data') END;
            END;

            CREATE TRIGGER IF NOT EXISTS trg_named_list_json_update
            BEFORE UPDATE ON named_list_tables
            FOR EACH ROW
            BEGIN
                SELECT CASE WHEN NEW.data IS NOT NULL AND json_valid(NEW.data) = 0
                    THEN RAISE(ABORT, 'Invalid JSON in named_list_tables.data') END;
            END;
        `);
    },
};
