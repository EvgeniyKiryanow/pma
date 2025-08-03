import { app, ipcMain, BrowserWindow } from 'electron';
import { getDb } from '../database/db';
import { CommentOrHistoryEntry } from 'src/types/user';
import path from 'path';
import fs from 'fs/promises';
import saveHistoryFiles from '../helpers/saveHistoryFiles';
const base = path.join(app.getPath('userData'), 'user_files');
import mime from 'mime-types';

export function registertUserHistoryHandlers() {
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
