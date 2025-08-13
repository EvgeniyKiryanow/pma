// src/database/migrations.ts
import { getDb } from './db';

export async function upgradeDbSchema() {
    const db = await getDb();

    await db.exec('PRAGMA foreign_keys = ON');
    await db.exec('BEGIN');
    try {
        // ======= users (your existing part) =======
        const existingColumns = await db.all(`PRAGMA table_info(users);`);
        const columnNames = existingColumns.map((c: any) => c.name);

        const expectedSchema: Record<string, string> = {
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
            education: 'TEXT',
            awards: 'TEXT',
            relatives: 'TEXT',
            comments: 'TEXT',
            history: 'TEXT',

            callsign: 'TEXT',
            passportData: 'TEXT',
            participantNumber: 'TEXT',
            identificationNumber: 'TEXT',
            hasCriminalRecord: 'INTEGER DEFAULT 0 CHECK (hasCriminalRecord IN (0,1))',
            fitnessCategory: 'TEXT',
            unitNumber: 'TEXT',
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

            unitMain: 'TEXT',
            unitLevel1: 'TEXT',
            unitLevel2: 'TEXT',
            platoon: 'TEXT',
            squad: 'TEXT',

            vosCode: 'TEXT',
            shpkCode: 'TEXT',
            shpkNumber: 'TEXT',
            category: 'TEXT',
            kshp: 'TEXT',

            rankAssignedBy: 'TEXT',
            rankAssignmentDate: 'TEXT',
            appointmentOrder: 'TEXT',
            previousStatus: 'TEXT',

            placeOfBirth: 'TEXT',
            taxId: 'TEXT',
            serviceType: 'TEXT',
            recruitmentOfficeDetails: 'TEXT',
            ubdStatus: 'TEXT',
            childrenInfo: 'TEXT',

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

            soldierStatus: 'TEXT',
        };

        const missingColumns: { name: string; type: string }[] = [];
        for (const [name, type] of Object.entries(expectedSchema)) {
            if (!columnNames.includes(name)) missingColumns.push({ name, type });
        }
        for (const { name, type } of missingColumns) {
            await db.exec(`ALTER TABLE users ADD COLUMN ${name} ${type};`);
        }
        if (missingColumns.length) {
            console.log(
                '✅ DB schema upgraded. Added columns:',
                missingColumns.map((c) => c.name),
            );
        } else {
            console.log('✅ DB schema is already up to date.');
        }

        // ======= user_history (your existing part) =======
        const historyColumns = await db.all(`PRAGMA table_info(user_history);`);
        const historyColumnNames = historyColumns.map((c: any) => c.name);
        const missingHistoryColumns: { name: string; type: string }[] = [];
        if (!historyColumnNames.includes('period_from')) {
            missingHistoryColumns.push({ name: 'period_from', type: 'TEXT' });
        }
        if (!historyColumnNames.includes('period_to')) {
            missingHistoryColumns.push({ name: 'period_to', type: 'TEXT' });
        }
        for (const { name, type } of missingHistoryColumns) {
            await db.exec(`ALTER TABLE user_history ADD COLUMN ${name} ${type};`);
        }
        if (missingHistoryColumns.length) {
            console.log(
                '✅ user_history schema upgraded. Added columns:',
                missingHistoryColumns.map((c) => c.name),
            );
        }

        // ======= indexes (your existing part) =======
        await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_shpk ON users(shpkNumber);
      CREATE INDEX IF NOT EXISTS idx_users_unitMain ON users(unitMain);
      CREATE INDEX IF NOT EXISTS idx_users_soldierStatus ON users(soldierStatus);
      CREATE INDEX IF NOT EXISTS idx_hist_user_date ON user_history(userId, date);
    `);

        // ======= NEW: roles + auth_user columns =======

        // Ensure auth_user table exists (safe if already exists)
        await db.exec(`
      CREATE TABLE IF NOT EXISTS auth_user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        recovery_hint TEXT DEFAULT '',
        role TEXT DEFAULT 'user',
        key TEXT,
        role_id INTEGER REFERENCES roles(id)
      );
    `);

        // Create roles table
        await db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        allowed_tabs TEXT NOT NULL  -- JSON array
      );
    `);

        // Add missing columns on auth_user (idempotent)
        const authCols = await db.all(`PRAGMA table_info(auth_user);`);
        const authNames = authCols.map((c: any) => c.name);
        const addIfMissing = async (name: string, ddl: string) => {
            if (!authNames.includes(name)) await db.exec(`ALTER TABLE auth_user ADD COLUMN ${ddl}`);
        };
        await addIfMissing('recovery_hint', 'recovery_hint TEXT DEFAULT ""');
        await addIfMissing('role', 'role TEXT DEFAULT "user"');
        await addIfMissing('key', 'key TEXT');
        await addIfMissing('role_id', 'role_id INTEGER REFERENCES roles(id)');

        // Seed default roles if not present
        const allTabs = [
            'manager',
            'backups',
            'reports',
            'tables',
            'importUsers',
            'shtatni',
            'instructions',
            'admin',
        ];
        const userTabs = ['manager', 'reports', 'tables', 'instructions'];

        await db.run(
            `INSERT OR IGNORE INTO roles (name, description, allowed_tabs)
       VALUES ('admin','Full access',json(?)),
              ('user','Limited access',json(?))`,
            JSON.stringify(allTabs),
            JSON.stringify(userTabs),
        );

        // Backfill role_id from legacy text role, else -> 'user'
        await db.run(`
      UPDATE auth_user
      SET role_id = (
        SELECT id FROM roles
        WHERE name = CASE LOWER(COALESCE(auth_user.role,'')) WHEN 'admin' THEN 'admin' ELSE 'user' END
      )
      WHERE role_id IS NULL
    `);

        await db.exec('COMMIT');
    } catch (e) {
        await db.exec('ROLLBACK');
        console.error('❌ upgradeDbSchema failed:', e);
        throw e;
    }
}
