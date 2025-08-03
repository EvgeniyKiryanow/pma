import { app, ipcMain, BrowserWindow } from 'electron';
import { getDb } from '../database/db';
import { CommentOrHistoryEntry } from 'src/types/user';
import path from 'path';
import fs from 'fs/promises';
import saveHistoryFiles from '../helpers/saveHistoryFiles';
const base = path.join(app.getPath('userData'), 'user_files');
import mime from 'mime-types';

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
        vosCode, shpkCode,shpkNumber, category, kshp,
        rankAssignedBy, rankAssignmentDate, appointmentOrder, previousStatus,
        placeOfBirth, taxId, serviceType, recruitmentOfficeDetails, ubdStatus, childrenInfo,
        bzvpStatus, rvbzPresence, absenceReason, absenceFromDate, absenceToDate,
        subordination, gender,
        personalPrisonFileExists, tDotData,
        positionNominative, positionGenitive, positionDative, positionInstrumental, soldierStatus
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?,  -- subordination, gender
        ?, ?,  -- personalPrisonFileExists, tDotData
        ?, ?, ?, ?, ? -- all 5 position cases
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
            user.shpkNumber,
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
            user.soldierStatus,
        );

        const insertedId = result.lastID;

        const inserted = await db.get('SELECT * FROM users WHERE id = ?', insertedId);

        // ✅ Логування зміни
        try {
            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'users',
                insertedId,
                'insert',
                JSON.stringify(inserted),
                'local',
            );
        } catch (err) {
            console.warn(
                `[ChangeHistory] ❌ Помилка при логуванні insert для user id=${insertedId}`,
                err,
            );
        }

        return {
            ...inserted,
            relatives: JSON.parse(inserted.relatives || '[]'),
            comments: JSON.parse(inserted.comments || '[]'),
            history: JSON.parse(inserted.history || '[]'),
        };
    });

    ipcMain.handle('update-user', async (_event, user) => {
        const db = await getDb();
        // 1. Отримуємо старий запис (для перевірки існування та можливих diff-логів у майбутньому)
        const existing = await db.get('SELECT * FROM users WHERE id = ?', user.id);
        if (!existing) {
            console.warn(`[Users] ⚠️ update-user: користувача з id=${user.id} не знайдено`);
            return { success: false, message: 'User not found' };
        }
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
            vosCode = ?, shpkCode = ?, shpkNumber = ?, category = ?, kshp = ?,
            rankAssignedBy = ?, rankAssignmentDate = ?, appointmentOrder = ?, previousStatus = ?,
            placeOfBirth = ?, taxId = ?, serviceType = ?, recruitmentOfficeDetails = ?, 
            ubdStatus = ?, childrenInfo = ?,
            bzvpStatus = ?, rvbzPresence = ?, absenceReason = ?, absenceFromDate = ?, absenceToDate = ?,
            subordination = ?, gender = ?,
            personalPrisonFileExists = ?, tDotData = ?,
            positionNominative = ?, positionGenitive = ?, positionDative = ?, positionInstrumental = ?,
            soldierStatus = ?

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
                user.shpkNumber,
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
                user.soldierStatus,

                // ✅ WHERE id
                user.id,
            ],
        );

        // 3. Логування зміни
        try {
            const updated = await db.get('SELECT * FROM users WHERE id = ?', user.id);

            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'users',
                user.id,
                'update',
                JSON.stringify(updated),
                'local',
            );
        } catch (err) {
            console.warn(
                `[ChangeHistory] ❌ Помилка при логуванні update для user id=${user.id}`,
                err,
            );
        }

        return user;
    });

    ipcMain.handle('delete-user', async (_event, userId: number) => {
        const db = await getDb();

        // 1. Отримати користувача перед видаленням
        const user = await db.get(`SELECT * FROM users WHERE id = ?`, userId);
        if (!user) {
            console.warn(`[Users] ⚠️ delete-user: користувача з id=${userId} не знайдено`);
            return false;
        }

        // 2. Видалити користувача
        await db.run('DELETE FROM users WHERE id = ?', userId);

        // 3. Логування видалення
        try {
            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'users',
                userId,
                'delete',
                JSON.stringify(user),
                'local',
            );
        } catch (err) {
            console.warn(`[ChangeHistory] ❌ Помилка при логуванні delete user id=${userId}`, err);
        }

        return true;
    });

    // main.ts or preload.ts
    ipcMain.handle('bulkUpdateUsers', async (_event, updatedUsers: any) => {
        const db = await getDb();

        try {
            for (const user of updatedUsers) {
                await db.run(
                    `UPDATE users SET 
                    position = ?, 
                    unitMain = ?, 
                    category = ?, 
                    shpkCode = ?, 
                    shpkNumber = ?
                 WHERE id = ?`,
                    [
                        user.position,
                        user.unitMain,
                        user.category,
                        user.shpkCode,
                        user.shpkNumber,
                        user.id,
                    ],
                );
            }

            return { success: true };
        } catch (err) {
            console.error('❌ Error in bulkUpdateUsers:', err);
            throw err;
        }
    });

    ipcMain.handle('users:get-db-columns', async () => {
        const db = await getDb();
        const columns = await db.all(`PRAGMA table_info(users);`);
        return columns.map((c: any) => c.name);
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
