import { getDb } from './db';

export async function upgradeDbSchema() {
    const db = await getDb();

    const existingColumns = await db.all(`PRAGMA table_info(users);`);
    const columnNames = existingColumns.map((c: any) => c.name);

    const missingColumns: { name: string; type: string }[] = [];

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
    };

    for (const [col, type] of Object.entries(expectedSchema)) {
        if (!columnNames.includes(col)) {
            missingColumns.push({ name: col, type });
        }
    }

    for (const { name, type } of missingColumns) {
        await db.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
    }

    if (missingColumns.length) {
        console.log(
            'Upgraded DB schema. Added columns:',
            missingColumns.map((c) => c.name),
        );
    }
}
