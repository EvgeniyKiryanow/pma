import { getDb } from './db';

export async function upgradeDbSchema() {
    const db = await getDb();

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

        // New fields
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
        ubdNumber: 'TEXT',
        identNumber: 'TEXT',
        militaryFitness: 'TEXT',
        subdivisionNumber: 'TEXT',
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
}
