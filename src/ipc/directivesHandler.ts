import { ipcMain, dialog, app, ipcRenderer } from 'electron';
import fs from 'fs';
import { getDbPath, getDb } from '../database/db';

import path from 'path';

export function registerDirectivesHandler() {
    ipcMain.handle('directives:add', async (_e, entry) => {
        const db = await getDb();
        await db.run(
            `INSERT INTO user_directives 
             (userId, type, title, description, file, period_from, period_to, date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                entry.userId,
                entry.type,
                entry.title,
                entry.description || '',
                JSON.stringify(entry.file),
                entry.period?.from || '',
                entry.period?.to || '',
                entry.date,
            ],
        );
    });
    ipcMain.handle('directives:deleteById', async (_e, id: number) => {
        const db = await getDb();

        // 1. Отримуємо запис перед видаленням
        const row = await db.get(`SELECT * FROM user_directives WHERE id = ?`, [id]);
        if (!row) {
            console.warn(`[Directives] ⚠️ deleteById: запис з id=${id} не знайдено`);
            return;
        }

        // 2. Видаляємо
        await db.run(`DELETE FROM user_directives WHERE id = ?`, [id]);

        // 3. Логуємо зміну
        try {
            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'user_directives',
                row.id,
                'delete',
                JSON.stringify(row),
                'local', // або clientId, якщо буде
            );
        } catch (err) {
            console.warn(`[ChangeHistory] ❌ Помилка при логуванні delete id=${id}`, err);
        }
    });

    ipcMain.handle('directives:delete', async (_e, { userId, date }) => {
        const db = await getDb();
        await db.run(`DELETE FROM user_directives WHERE userId = ? AND date = ?`, [userId, date]);
    });
    ipcMain.handle('directives:clearByType', async (_e, type: string) => {
        const db = await getDb();
        await db.run(`DELETE FROM user_directives WHERE type = ?`, [type]);
    });

    ipcMain.handle('directives:getAllByType', async (_e, type: string) => {
        const db = await getDb();
        const rows = await db.all(
            `SELECT * FROM user_directives WHERE type = ? ORDER BY date DESC`,
            [type],
        );

        return rows.map((row: any) => ({
            id: row.id, // ✅ include ID
            userId: row.userId,
            type: row.type,
            title: row.title,
            description: row.description,
            file: row.file ? JSON.parse(row.file) : null,
            date: row.date,
            period: {
                from: row.period_from || '',
                to: row.period_to || '',
            },
        }));
    });
}
