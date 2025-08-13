import { getDb } from './db';

export async function upgradeDbSchema() {
    const db = await getDb();

    // Все робимо атомарно
    await db.exec('BEGIN');
    try {
        // ---- users ----
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
            // для нових інсталяцій: boolean як 0/1
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

            // ✅ New hierarchy fields
            unitMain: 'TEXT',
            unitLevel1: 'TEXT',
            unitLevel2: 'TEXT',
            platoon: 'TEXT',
            squad: 'TEXT',

            // ✅ Military specialization
            vosCode: 'TEXT',
            shpkCode: 'TEXT',
            shpkNumber: 'TEXT',
            category: 'TEXT',
            kshp: 'TEXT',

            // ✅ Rank / appointment details
            rankAssignedBy: 'TEXT',
            rankAssignmentDate: 'TEXT',
            appointmentOrder: 'TEXT',
            previousStatus: 'TEXT',

            // ✅ Personal details
            placeOfBirth: 'TEXT',
            taxId: 'TEXT',
            serviceType: 'TEXT',
            recruitmentOfficeDetails: 'TEXT',
            ubdStatus: 'TEXT',
            childrenInfo: 'TEXT',

            // ✅ Absence / status fields
            bzvpStatus: 'TEXT',
            rvbzPresence: 'TEXT',
            absenceReason: 'TEXT',
            absenceFromDate: 'TEXT',
            absenceToDate: 'TEXT',

            // ✅ Subordination
            subordination: 'TEXT',
            gender: 'TEXT',

            // ✅ Excel-specific fields
            personalPrisonFileExists: 'TEXT',
            tDotData: 'TEXT',
            positionNominative: 'TEXT',
            positionGenitive: 'TEXT',
            positionDative: 'TEXT',
            positionInstrumental: 'TEXT',

            // ✅ (було пропущено) soldierStatus
            soldierStatus: 'TEXT',
        };

        const missingColumns: { name: string; type: string }[] = [];
        for (const [col, type] of Object.entries(expectedSchema)) {
            if (!columnNames.includes(col)) {
                missingColumns.push({ name: col, type });
            }
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

        // ---- user_history ----
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

        // ---- індекси (ідемпотентно) ----
        await db.exec(`
          CREATE INDEX IF NOT EXISTS idx_users_shpk ON users(shpkNumber);
          CREATE INDEX IF NOT EXISTS idx_users_unitMain ON users(unitMain);
          CREATE INDEX IF NOT EXISTS idx_users_soldierStatus ON users(soldierStatus);
          CREATE INDEX IF NOT EXISTS idx_hist_user_date ON user_history(userId, date);
        `);

        await db.exec('COMMIT');
    } catch (e) {
        await db.exec('ROLLBACK');
        console.error('❌ upgradeDbSchema failed:', e);
        throw e;
    }
}
