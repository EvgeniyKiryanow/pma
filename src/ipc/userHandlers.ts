import { app, ipcMain } from 'electron';
import { getDb } from '../database/db';
import { CommentOrHistoryEntry } from 'src/types/user';

export function registerUserHandlers() {
    ipcMain.handle('fetch-users', async () => {
        const db = await getDb();
        const rows = await db.all('SELECT * FROM users');

        const safeParse = (jsonStr: string, fallback: any) => {
            try {
                return JSON.parse(jsonStr);
            } catch {
                return fallback;
            }
        };

        return rows.map((row: any) => ({
            ...row,
            relatives: safeParse(row.relatives, []),
            comments: safeParse(row.comments, []),
            history: safeParse(row.history, []),
        }));
    });

    ipcMain.handle('add-user', async (_event, user) => {
        const db = await getDb();

        const stmt = await db.prepare(`
      INSERT INTO users (
        fullName, photo, phoneNumber, email, dateOfBirth,
        position, rank, rights, conscriptionInfo, notes,
        relatives, comments, history, education, awards,
        callsign, passportData, participantNumber, identificationNumber,
        fitnessCategory, unitNumber, hasCriminalRecord, criminalRecordDetails,
        militaryTicketInfo, militaryServiceHistory, civilProfession,
        educationDetails, residenceAddress, registeredAddress,
        healthConditions, maritalStatus, familyInfo, religion,
        recruitingOffice, driverLicenses, bloodType,
        unitMain, unitLevel1, unitLevel2, platoon, squad,
        vosCode, shpkCode, category, kshp,
        rankAssignedBy, rankAssignmentDate, appointmentOrder, previousStatus,
        placeOfBirth, taxId, serviceType, recruitmentOfficeDetails, ubdStatus, childrenInfo,
        bzvpStatus, rvbzPresence, absenceReason, absenceFromDate, absenceToDate,
        subordination, gender,
        personalPrisonFileExists, tDotData,
        positionNominative, positionGenitive, positionDative, positionInstrumental
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?,  -- subordination, gender
        ?, ?,  -- personalPrisonFileExists, tDotData
        ?, ?, ?, ? -- all 4 position cases
      )
    `);

        const result = await stmt.run(
            user.fullName,
            user.photo,
            user.phoneNumber,
            user.email,
            user.dateOfBirth,
            user.position,
            user.rank,
            user.rights,
            user.conscriptionInfo,
            user.notes,
            JSON.stringify(user.relatives || []),
            JSON.stringify(user.comments || []),
            JSON.stringify(user.history || []),
            user.education,
            user.awards,
            user.callsign,
            user.passportData,
            user.participantNumber,
            user.identificationNumber,
            user.fitnessCategory,
            user.unitNumber,
            user.hasCriminalRecord ? 1 : 0,
            user.criminalRecordDetails,
            user.militaryTicketInfo,
            user.militaryServiceHistory,
            user.civilProfession,
            user.educationDetails,
            user.residenceAddress,
            user.registeredAddress,
            user.healthConditions,
            user.maritalStatus,
            user.familyInfo,
            user.religion,
            user.recruitingOffice,
            user.driverLicenses,
            user.bloodType,

            // ✅ new hierarchy
            user.unitMain,
            user.unitLevel1,
            user.unitLevel2,
            user.platoon,
            user.squad,

            // ✅ military specialization
            user.vosCode,
            user.shpkCode,
            user.category,
            user.kshp,

            // ✅ rank/appointment
            user.rankAssignedBy,
            user.rankAssignmentDate,
            user.appointmentOrder,
            user.previousStatus,

            // ✅ personal details
            user.placeOfBirth,
            user.taxId,
            user.serviceType,
            user.recruitmentOfficeDetails,
            user.ubdStatus,
            user.childrenInfo,

            // ✅ absence/status
            user.bzvpStatus,
            user.rvbzPresence,
            user.absenceReason,
            user.absenceFromDate,
            user.absenceToDate,

            // ✅ subordination
            user.subordination,
            user.gender,

            // ✅ new Excel-specific
            user.personalPrisonFileExists,
            user.tDotData,
            user.positionNominative,
            user.positionGenitive,
            user.positionDative,
            user.positionInstrumental,
        );

        const inserted = await db.get('SELECT * FROM users WHERE id = ?', result.lastID);

        return {
            ...inserted,
            relatives: JSON.parse(inserted.relatives || '[]'),
            comments: JSON.parse(inserted.comments || '[]'),
            history: JSON.parse(inserted.history || '[]'),
        };
    });

    ipcMain.handle('update-user', async (_event, user) => {
        const db = await getDb();

        await db.run(
            `
        UPDATE users SET
            fullName = ?, photo = ?, phoneNumber = ?, email = ?, dateOfBirth = ?,
            position = ?, rank = ?, rights = ?, conscriptionInfo = ?, notes = ?,
            relatives = ?, comments = ?, history = ?, education = ?, awards = ?,
            callsign = ?, passportData = ?, participantNumber = ?, identificationNumber = ?,
            fitnessCategory = ?, unitNumber = ?, hasCriminalRecord = ?, criminalRecordDetails = ?,
            militaryTicketInfo = ?, militaryServiceHistory = ?, civilProfession = ?,
            educationDetails = ?, residenceAddress = ?, registeredAddress = ?,
            healthConditions = ?, maritalStatus = ?, familyInfo = ?, religion = ?,
            recruitingOffice = ?, driverLicenses = ?, bloodType = ?,
            unitMain = ?, unitLevel1 = ?, unitLevel2 = ?, platoon = ?, squad = ?,
            vosCode = ?, shpkCode = ?, category = ?, kshp = ?,
            rankAssignedBy = ?, rankAssignmentDate = ?, appointmentOrder = ?, previousStatus = ?,
            placeOfBirth = ?, taxId = ?, serviceType = ?, recruitmentOfficeDetails = ?, 
            ubdStatus = ?, childrenInfo = ?,
            bzvpStatus = ?, rvbzPresence = ?, absenceReason = ?, absenceFromDate = ?, absenceToDate = ?,
            subordination = ?, gender = ?,
            personalPrisonFileExists = ?, tDotData = ?,
            positionNominative = ?, positionGenitive = ?, positionDative = ?, positionInstrumental = ?

        WHERE id = ?
        `,
            [
                user.fullName,
                user.photo,
                user.phoneNumber,
                user.email,
                user.dateOfBirth,
                user.position,
                user.rank,
                user.rights,
                user.conscriptionInfo,
                user.notes,
                JSON.stringify(user.relatives || []),
                JSON.stringify(user.comments || []),
                JSON.stringify(user.history || []),
                user.education,
                user.awards,
                user.callsign,
                user.passportData,
                user.participantNumber,
                user.identificationNumber,
                user.fitnessCategory,
                user.unitNumber,
                user.hasCriminalRecord ? 1 : 0,
                user.criminalRecordDetails,
                user.militaryTicketInfo,
                user.militaryServiceHistory,
                user.civilProfession,
                user.educationDetails,
                user.residenceAddress,
                user.registeredAddress,
                user.healthConditions,
                user.maritalStatus,
                user.familyInfo,
                user.religion,
                user.recruitingOffice,
                user.driverLicenses,
                user.bloodType,

                // ✅ new hierarchy
                user.unitMain,
                user.unitLevel1,
                user.unitLevel2,
                user.platoon,
                user.squad,

                // ✅ military specialization
                user.vosCode,
                user.shpkCode,
                user.category,
                user.kshp,

                // ✅ rank/appointment
                user.rankAssignedBy,
                user.rankAssignmentDate,
                user.appointmentOrder,
                user.previousStatus,

                // ✅ personal details
                user.placeOfBirth,
                user.taxId,
                user.serviceType,
                user.recruitmentOfficeDetails,
                user.ubdStatus,
                user.childrenInfo,

                // ✅ absence/status
                user.bzvpStatus,
                user.rvbzPresence,
                user.absenceReason,
                user.absenceFromDate,
                user.absenceToDate,

                // ✅ subordination
                user.subordination,
                user.gender,

                // ✅ Excel-specific
                user.personalPrisonFileExists,
                user.tDotData,
                user.positionNominative,
                user.positionGenitive,
                user.positionDative,
                user.positionInstrumental,

                // ✅ WHERE id
                user.id,
            ],
        );

        return user;
    });

    ipcMain.handle('delete-user', async (_event, userId: number) => {
        const db = await getDb();
        await db.run('DELETE FROM users WHERE id = ?', userId);
        return true;
    });

    ipcMain.handle('users:get-db-columns', async () => {
        const db = await getDb();
        const columns = await db.all(`PRAGMA table_info(users);`);
        return columns.map((c: any) => c.name);
    });

    ipcMain.handle('history:get-user-history', async (_event, userId: number, filter: string) => {
        const db = await getDb();

        const user = await db.get('SELECT history FROM users WHERE id = ?', userId);
        if (!user || !user.history) return [];

        const history: CommentOrHistoryEntry[] = JSON.parse(user.history);

        const fromDate = getFilterDate(filter);
        return history.filter((entry) => new Date(entry.date) >= fromDate);
    });
    ipcMain.handle('history:add-entry', async (_event, userId: number, newEntry: any) => {
        const db = await getDb();
        const user = await db.get(`SELECT history FROM users WHERE id = ?`, userId);

        const existingHistory = user?.history ? JSON.parse(user.history) : [];

        existingHistory.push(newEntry);

        await db.run(
            `UPDATE users SET history = ? WHERE id = ?`,
            JSON.stringify(existingHistory),
            userId,
        );
        return { success: true };
    });
    ipcMain.handle('deleteUserHistory', async (_, id: number) => {
        const db = await getDb();
        const users = await db.all('SELECT id, history FROM users');
        for (const user of users) {
            const history = JSON.parse(user.history || '[]');
            const updated = history.filter((item: any) => item.id !== id);
            if (updated.length !== history.length) {
                await db.run(
                    'UPDATE users SET history = ? WHERE id = ?',
                    JSON.stringify(updated),
                    user.id,
                );
            }
        }
        return true;
    });
    ipcMain.handle('comments:get-user-comments', async (_event, userId: number) => {
        const db = await getDb();
        const user = await db.get('SELECT comments FROM users WHERE id = ?', userId);
        if (!user || !user.comments) return [];
        return JSON.parse(user.comments);
    });

    ipcMain.handle('comments:add-user-comment', async (_event, userId: number, newComment: any) => {
        const db = await getDb();
        const user = await db.get('SELECT comments FROM users WHERE id = ?', userId);
        const comments = user?.comments ? JSON.parse(user.comments) : [];
        comments.push(newComment);
        await db.run(
            'UPDATE users SET comments = ? WHERE id = ?',
            JSON.stringify(comments),
            userId,
        );
        return { success: true };
    });

    ipcMain.handle('comments:delete-user-comment', async (_event, id: number) => {
        const db = await getDb();
        const users = await db.all('SELECT id, comments FROM users');

        for (const user of users) {
            const comments = JSON.parse(user.comments || '[]');
            const updated = comments.filter((entry: any) => entry.id !== id);

            if (updated.length !== comments.length) {
                await db.run(
                    'UPDATE users SET comments = ? WHERE id = ?',
                    JSON.stringify(updated),
                    user.id,
                );
            }
        }

        return true;
    });
    ipcMain.on('app:close', () => {
        if (process.platform === 'darwin') {
            app.exit(0);
        } else {
            app.quit();
        }
    });
}
export function getFilterDate(filter: string): Date {
    const now = new Date();
    const map: Record<string, number> = {
        '1day': 1,
        '7days': 7,
        '14days': 14,
        '30days': 30,
        all: 100 * 365,
    };

    const days = map[filter] ?? 30;
    now.setDate(now.getDate() - days);
    return now;
}
