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

        return user;
    });

    ipcMain.handle('delete-user', async (_event, userId: number) => {
        const db = await getDb();
        await db.run('DELETE FROM users WHERE id = ?', userId);
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

        const entryId = newEntry.id;
        const rawFiles = newEntry.files || [];

        // ✅ Save files to disk
        await saveHistoryFiles(userId, entryId, rawFiles);

        // ✅ Only store metadata
        const cleanedFiles = rawFiles.map((f: any) => ({
            name: f.name,
            type: f.type,
            size: f.size,
        }));

        const cleanEntry = {
            ...newEntry,
            files: cleanedFiles,
        };

        existingHistory.push(cleanEntry);

        await db.run(
            `UPDATE users SET history = ? WHERE id = ?`,
            JSON.stringify(existingHistory),
            userId,
        );

        return { success: true };
    });

    ipcMain.handle('users:get-one', async (_event, userId) => {
        const db = await getDb();
        const user = await db.get('SELECT * FROM users WHERE id = ?', userId);
        if (!user) return null;

        const safeParse = (jsonStr: string, fallback: any) => {
            try {
                return JSON.parse(jsonStr);
            } catch {
                return fallback;
            }
        };

        return {
            ...user,
            relatives: safeParse(user.relatives, []),
            comments: safeParse(user.comments, []),
            history: safeParse(user.history, []),
        };
    });

    ipcMain.handle('fetch-users-metadata', async () => {
        const db = await getDb();
        const rows = await db.all('SELECT * FROM users');

        const safeParse = (jsonStr: string, fallback: any) => {
            try {
                return JSON.parse(jsonStr);
            } catch {
                return fallback;
            }
        };

        return rows.map((row: any) => {
            const { history, comments, relatives, ...rest } = row;
            return {
                ...rest,
                relatives: safeParse(relatives, []), // we keep relatives
            };
        });
    });

    ipcMain.handle('history:load-file', async (_event, userId, entryId, filename) => {
        const fullPath = path.join(
            app.getPath('userData'),
            'history_files', // FIXED here
            userId.toString(),
            entryId.toString(),
            filename,
        );

        try {
            const buffer = await fs.readFile(fullPath);
            const mimeType = mime.lookup(filename) || 'application/octet-stream';
            return {
                dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
            };
        } catch (err) {
            console.warn(`❌ Failed to read file ${filename}:`, err);
            throw new Error(`Файл не знайдено: ${filename}`);
        }
    });

    ipcMain.handle(
        'history:getByUserAndRange',
        async (_event, userId: number, range: '1d' | '7d' | '30d' | 'all') => {
            const db = await getDb();
            const user = await db.get('SELECT history FROM users WHERE id = ?', userId);
            if (!user?.history) return [];

            const allHistory: CommentOrHistoryEntry[] = JSON.parse(user.history);
            const now = new Date();
            const threshold = new Date(now);

            if (range !== 'all') {
                const days = range === '1d' ? 1 : range === '7d' ? 7 : 30;
                threshold.setDate(now.getDate() - days);
            }

            return allHistory.filter((entry) => {
                if (range === 'all') return true;
                return new Date(entry.date) >= threshold;
            });
        },
    );

    ipcMain.handle(
        'history:edit-entry',
        async (_event, userId: number, updatedEntry: CommentOrHistoryEntry) => {
            const db = await getDb();
            const user = await db.get('SELECT history FROM users WHERE id = ?', userId);
            if (!user) return { success: false, message: 'User not found' };

            const history: CommentOrHistoryEntry[] = user?.history ? JSON.parse(user.history) : [];
            const idx = history.findIndex((h) => h.id === updatedEntry.id);
            if (idx === -1) return { success: false, message: 'History entry not found' };

            const entryId = updatedEntry.id;
            const newFiles = updatedEntry.files || [];

            // ✅ Delete any files that existed before but are not in updated list
            const oldFiles = history[idx].files || [];
            const oldNames = oldFiles.map((f) => f.name);
            const newNames = newFiles.map((f) => f.name);
            const removedFiles = oldNames.filter((name) => !newNames.includes(name));

            const entryDir = path.join(
                app.getPath('userData'),
                'history_files',
                `${userId}`,
                `${entryId}`,
            );
            for (const name of removedFiles) {
                try {
                    const fullPath = path.join(entryDir, name);
                    await fs.rm(fullPath, { force: true });
                } catch (err) {
                    console.warn(`⚠️ Failed to delete removed file "${name}"`, err);
                }
            }

            // ✅ Save new/updated files to disk
            await saveHistoryFiles(userId, entryId, newFiles);

            // ✅ Store only metadata (skip dataUrl)
            const cleanedFiles = newFiles.map((f) => ({
                name: f.name,
                type: f.type,
                size: f.size,
            }));

            history[idx] = {
                ...updatedEntry,
                files: cleanedFiles,
            };

            await db.run(
                'UPDATE users SET history = ? WHERE id = ?',
                JSON.stringify(history),
                userId,
            );

            return { success: true };
        },
    );

    ipcMain.handle('deleteUserHistory', async (_event, historyId: number) => {
        const db = await getDb();
        const users = await db.all('SELECT id, history FROM users');

        for (const user of users) {
            const history: CommentOrHistoryEntry[] = JSON.parse(user.history || '[]');
            const match = history.find((h) => h.id === historyId);
            if (!match) continue;

            // ✅ Remove entry
            const updatedHistory = history.filter((item) => item.id !== historyId);
            await db.run(
                'UPDATE users SET history = ? WHERE id = ?',
                JSON.stringify(updatedHistory),
                user.id,
            );

            // ✅ Delete associated files (FIXED path from "user_files" to "history_files")
            const dirPath = path.join(
                app.getPath('userData'),
                'history_files',
                String(user.id),
                String(historyId),
            );

            try {
                await fs.rm(dirPath, { recursive: true, force: true });
                console.log(`🗑️ Deleted files for history ${historyId} of user ${user.id}`);
            } catch (err) {
                console.warn(`⚠️ Failed to delete files for history ${historyId}:`, err);
            }

            return { success: true, deletedFromUserId: user.id };
        }

        return { success: false, message: 'History entry not found in any user' };
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

    ipcMain.on('app:toggle-fullscreen', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
            win.setFullScreen(!win.isFullScreen());
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
