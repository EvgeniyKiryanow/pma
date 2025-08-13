import { app, ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';

import saveHistoryFiles from '../../../helpers/saveHistoryFiles';
import { CommentOrHistoryEntry } from '../../../shared/types/user';
import { getDb } from '../../db/db';
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

    ipcMain.handle('history:add-entry', async (_event, userId: number, newEntry: any) => {
        const db = await getDb();
        const user = await db.get(`SELECT * FROM users WHERE id = ?`, userId);

        if (!user) {
            console.warn(`[History] ⚠️ add-entry: користувача з id=${userId} не знайдено`);
            return { success: false, message: 'User not found' };
        }

        const existingHistory = user.history ? JSON.parse(user.history) : [];

        const entryId = newEntry.id;
        const rawFiles = newEntry.files || [];

        // ✅ Збереження файлів на диск
        await saveHistoryFiles(userId, entryId, rawFiles);

        // ✅ Зберігаємо тільки метадані
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

        // ✅ Оновлюємо історію в БД
        await db.run(
            `UPDATE users SET history = ? WHERE id = ?`,
            JSON.stringify(existingHistory),
            userId,
        );

        // ✅ Отримуємо оновлений запис користувача для логування
        const updatedUser = await db.get(`SELECT * FROM users WHERE id = ?`, userId);

        // ✅ Логування
        try {
            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'users',
                userId,
                'update',
                JSON.stringify(updatedUser),
                'local',
            );
        } catch (err) {
            console.warn(
                `[ChangeHistory] ❌ Помилка при логуванні history:add-entry для user id=${userId}`,
                err,
            );
        }

        return { success: true };
    });

    ipcMain.handle(
        'history:edit-entry',
        async (_event, userId: number, updatedEntry: CommentOrHistoryEntry) => {
            const db = await getDb();
            const user = await db.get('SELECT * FROM users WHERE id = ?', userId);
            if (!user) return { success: false, message: 'User not found' };

            const history: CommentOrHistoryEntry[] = user.history ? JSON.parse(user.history) : [];
            const idx = history.findIndex((h) => h.id === updatedEntry.id);
            if (idx === -1) return { success: false, message: 'History entry not found' };

            const entryId = updatedEntry.id;
            const newFiles = updatedEntry.files || [];

            // ✅ Видалення старих файлів, які відсутні в оновленій версії
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

            // ✅ Зберігаємо нові/оновлені файли
            await saveHistoryFiles(userId, entryId, newFiles);

            // ✅ Зберігаємо лише метадані файлів
            const cleanedFiles = newFiles.map((f) => ({
                name: f.name,
                type: f.type,
                size: f.size,
            }));

            history[idx] = {
                ...updatedEntry,
                files: cleanedFiles,
            };

            // ✅ Оновлюємо базу
            await db.run(
                'UPDATE users SET history = ? WHERE id = ?',
                JSON.stringify(history),
                userId,
            );

            // ✅ Логування зміни
            try {
                const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', userId);

                await db.run(
                    `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
                 VALUES (?, ?, ?, ?, ?)`,
                    'users',
                    userId,
                    'update',
                    JSON.stringify(updatedUser),
                    'local',
                );
            } catch (err) {
                console.warn(
                    `[ChangeHistory] ❌ Помилка при логуванні history:edit-entry userId=${userId}`,
                    err,
                );
            }

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

            // ✅ Видаляємо запис із історії
            const updatedHistory = history.filter((item) => item.id !== historyId);
            await db.run(
                'UPDATE users SET history = ? WHERE id = ?',
                JSON.stringify(updatedHistory),
                user.id,
            );

            // ✅ Видаляємо файли, прив'язані до цього запису
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

            // ✅ Логування оновлення користувача
            try {
                const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', user.id);

                await db.run(
                    `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
                 VALUES (?, ?, ?, ?, ?)`,
                    'users',
                    user.id,
                    'update',
                    JSON.stringify(updatedUser),
                    'local',
                );
            } catch (err) {
                console.warn(
                    `[ChangeHistory] ❌ Помилка при логуванні видалення history id=${historyId}`,
                    err,
                );
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
