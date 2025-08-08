import { app, ipcMain } from 'electron';
import { getDb } from '../database/db';
import path from 'path';
import fs from 'fs/promises';
import saveHistoryFiles from '../helpers/saveHistoryFiles';
import mime from 'mime-types';

const base = path.join(app.getPath('userData'), 'user_files');

export function registerUserHandlers() {
    // ⚠️ Легасі-роут: повертає всіх користувачів (без пагінації)
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

    // ✅ Новий швидкий фетч з пагінацією та вибором колонок
    ipcMain.handle(
        'users:fetch-paginated',
        async (_e, args: { page?: number; limit?: number; fields?: string[] } = {}) => {
            const {
                page = 1,
                limit = 50,
                fields = ['id', 'fullName', 'unitMain', 'shpkNumber', 'rank', 'soldierStatus'],
            } = args || {};
            const offset = (page - 1) * limit;
            const sel = fields.map((f) => `"${f}"`).join(', ');
            const db = await getDb();

            const data = await db.all(`SELECT ${sel} FROM users LIMIT ? OFFSET ?`, limit, offset);
            const [{ cnt }] = await db.all(`SELECT COUNT(*) AS cnt FROM users`);
            return { data, page, limit, total: cnt };
        },
    );

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
        vosCode, shpkCode, shpkNumber, category, kshp,
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

        await db.exec('BEGIN');
        try {
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

            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
                 VALUES (?, ?, ?, ?, ?)`,
                'users',
                insertedId,
                'insert',
                JSON.stringify(inserted),
                'local',
            );

            await db.exec('COMMIT');

            return {
                ...inserted,
                relatives: JSON.parse(inserted.relatives || '[]'),
                comments: JSON.parse(inserted.comments || '[]'),
                history: JSON.parse(inserted.history || '[]'),
            };
        } catch (err) {
            await db.exec('ROLLBACK');
            console.warn(`[Users] ❌ add-user failed`, err);
            throw err;
        } finally {
            await stmt.finalize();
        }
    });

    ipcMain.handle('update-user', async (_event, user) => {
        const db = await getDb();

        const existing = await db.get('SELECT * FROM users WHERE id = ?', user.id);
        if (!existing) {
            console.warn(`[Users] ⚠️ update-user: користувача з id=${user.id} не знайдено`);
            return { success: false, message: 'User not found' };
        }

        await db.exec('BEGIN');
        try {
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

            await db.exec('COMMIT');
            return updated;
        } catch (err) {
            await db.exec('ROLLBACK');
            console.warn(`[Users] ❌ update-user failed id=${user.id}`, err);
            return { success: false, message: String(err) };
        }
    });

    ipcMain.handle('delete-user', async (_event, userId: number) => {
        const db = await getDb();

        const user = await db.get(`SELECT * FROM users WHERE id = ?`, userId);
        if (!user) {
            console.warn(`[Users] ⚠️ delete-user: користувача з id=${userId} не знайдено`);
            return false;
        }

        await db.exec('BEGIN');
        try {
            await db.run('DELETE FROM users WHERE id = ?', userId);

            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
                 VALUES (?, ?, ?, ?, ?)`,
                'users',
                userId,
                'delete',
                JSON.stringify(user),
                'local',
            );

            await db.exec('COMMIT');
            return true;
        } catch (err) {
            await db.exec('ROLLBACK');
            console.warn(`[ChangeHistory] ❌ Помилка при логуванні delete user id=${userId}`, err);
            return false;
        }
    });

    // Масове оновлення з prepared statements + транзакція
    ipcMain.handle('bulkUpdateUsers', async (_event, updatedUsers: any[]) => {
        const db = await getDb();

        await db.exec('BEGIN');
        try {
            const updStmt = await db.prepare(
                `UPDATE users SET 
                    position = ?, 
                    unitMain = ?, 
                    category = ?, 
                    shpkCode = ?, 
                    shpkNumber = ?
                 WHERE id = ?`,
            );
            const logStmt = await db.prepare(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
                 VALUES ('users', ?, 'update', ?, 'local')`,
            );

            for (const user of updatedUsers) {
                const existing = await db.get(`SELECT * FROM users WHERE id = ?`, user.id);
                if (!existing) {
                    console.warn(
                        `[Users] ⚠️ bulkUpdateUsers: користувача з id=${user.id} не знайдено`,
                    );
                    continue;
                }

                await updStmt.run(
                    user.position,
                    user.unitMain,
                    user.category,
                    user.shpkCode,
                    user.shpkNumber,
                    user.id,
                );

                const updated = await db.get('SELECT * FROM users WHERE id = ?', user.id);
                await logStmt.run(user.id, JSON.stringify(updated));
            }

            await updStmt.finalize();
            await logStmt.finalize();
            await db.exec('COMMIT');

            return { success: true };
        } catch (err) {
            await db.exec('ROLLBACK');
            console.error('❌ Error in bulkUpdateUsers:', err);
            return { success: false, error: (err as Error).message };
        }
    });

    ipcMain.handle('users:get-db-columns', async () => {
        const db = await getDb();
        const columns = await db.all(`PRAGMA table_info(users);`);
        return columns.map((c: any) => c.name);
    });
}

// Залишив як було — утиліта дат для фільтрів в інших місцях
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
