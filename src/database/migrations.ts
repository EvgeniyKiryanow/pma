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

        // ✅ New hierarchy fields
        unitMain: 'TEXT', // підрозділ
        unitLevel1: 'TEXT', // підрозділ 1
        unitLevel2: 'TEXT', // підрозділ 2
        platoon: 'TEXT', // взвод
        squad: 'TEXT', // відділення

        // ✅ Military specialization
        vosCode: 'TEXT', // ВОС
        shpkCode: 'TEXT', // ШПК
        shpkNumber: 'TEXT', // ШПК номер
        category: 'TEXT', // кат
        kshp: 'TEXT', // КШП

        // ✅ Rank / appointment details
        rankAssignedBy: 'TEXT', // Ким присвоєно, №наказу
        rankAssignmentDate: 'TEXT', // Дата присвоєння
        appointmentOrder: 'TEXT', // наказ на прийом/призначення
        previousStatus: 'TEXT', // попередній статус

        // ✅ Personal details
        placeOfBirth: 'TEXT', // Місце народження
        taxId: 'TEXT', // ІПН
        serviceType: 'TEXT', // Мобілізований чи контракт
        recruitmentOfficeDetails: 'TEXT', // До якого ТЦК відноситься
        ubdStatus: 'TEXT', // УБД (учасник бойових дій)
        childrenInfo: 'TEXT', // ПІБ дітей та рік народження

        // ✅ Absence / status fields
        bzvpStatus: 'TEXT', // БЗВП
        rvbzPresence: 'TEXT', // наявність в РВБЗ
        absenceReason: 'TEXT', // причина відсутності
        absenceFromDate: 'TEXT', // дата з
        absenceToDate: 'TEXT', // дата по

        // ✅ Subordination
        subordination: 'TEXT', // підпорядкування
        gender: 'TEXT', // гендер

        // ✅ New Excel-specific fields
        personalPrisonFileExists: 'TEXT', // Наявність особової справи
        tDotData: 'TEXT', // т.
        positionNominative: 'TEXT', // повна посада називний
        positionGenitive: 'TEXT', // повна посада родовий
        positionDative: 'TEXT', // повна посада давальний
        positionInstrumental: 'TEXT', // повна посада орудний
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
