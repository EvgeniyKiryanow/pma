import { ipcMain } from 'electron';

import { getDb } from '../../../database/db';

export function registerDirectivesHandler() {
    ipcMain.handle('directives:add', async (_e, entry) => {
        const db = await getDb();

        // 1. Вставка запису
        const res = await db.run(
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

        // 2. Логування зміни
        try {
            const insertedId = res.lastID;
            const fullEntry = {
                id: insertedId,
                userId: entry.userId,
                type: entry.type,
                title: entry.title,
                description: entry.description || '',
                file: entry.file,
                period_from: entry.period?.from || '',
                period_to: entry.period?.to || '',
                date: entry.date,
            };

            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'user_directives',
                insertedId,
                'insert',
                JSON.stringify(fullEntry),
                'local',
            );
        } catch (err) {
            console.warn('[ChangeHistory] ❌ Помилка при логуванні insert', err);
        }
    });

    ipcMain.handle('directives:deleteById', async (_e, id: number) => {
        const db = await getDb();

        // 1. Отримуємо запис перед видаленням
        const row = await db.get(`SELECT * FROM user_directives WHERE id = ?`, [id]);
        if (!row) {
            console.warn(`[Directives] ⚠️ deleteById: запис з id=${id} не знайдено`);
            return;
        }

        // 🔐 2. Перетворюємо file у JSON-строку, якщо потрібно
        if (row.file && typeof row.file === 'object') {
            try {
                row.file = JSON.stringify(row.file);
            } catch (err) {
                console.warn(
                    `[Directives] ⚠️ Неможливо серіалізувати поле "file" для id=${row.id}`,
                    err,
                );
                row.file = null;
            }
        }

        // 3. Видаляємо
        await db.run(`DELETE FROM user_directives WHERE id = ?`, [id]);

        // 4. Логуємо зміну
        try {
            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'user_directives',
                row.id,
                'delete',
                JSON.stringify(row),
                'local',
            );
        } catch (err) {
            console.warn(`[ChangeHistory] ❌ Помилка при логуванні delete id=${id}`, err);
        }
    });

    ipcMain.handle('directives:delete', async (_e, { userId, date }) => {
        const db = await getDb();

        // 1. Отримуємо всі записи перед видаленням
        const rows = await db.all(`SELECT * FROM user_directives WHERE userId = ? AND date = ?`, [
            userId,
            date,
        ]);

        if (!rows || rows.length === 0) {
            console.warn(`[Directives] ⚠️ delete: немає записів для userId=${userId} date=${date}`);
            return;
        }

        // 🔐 2. Обробляємо поля перед логуванням
        const toLog = rows.map((row: any) => {
            if (row.file && typeof row.file === 'object') {
                try {
                    row.file = JSON.stringify(row.file);
                } catch (err) {
                    console.warn(
                        `[Directives] ⚠️ Неможливо серіалізувати file для id=${row.id}`,
                        err,
                    );
                    row.file = null;
                }
            }
            return row;
        });

        // 3. Видаляємо всі записи
        await db.run(`DELETE FROM user_directives WHERE userId = ? AND date = ?`, [userId, date]);

        // 4. Логуємо кожне видалення
        for (const row of toLog) {
            try {
                await db.run(
                    `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
                 VALUES (?, ?, ?, ?, ?)`,
                    'user_directives',
                    row.id,
                    'delete',
                    JSON.stringify(row),
                    'local',
                );
            } catch (err) {
                console.warn(`[ChangeHistory] ❌ Помилка при логуванні delete id=${row.id}`, err);
            }
        }
    });

    ipcMain.handle('directives:clearByType', async (_e, type: string) => {
        const db = await getDb();

        // 1. Отримуємо всі записи перед видаленням
        const rows = await db.all(`SELECT * FROM user_directives WHERE type = ?`, [type]);

        if (!rows || rows.length === 0) {
            console.warn(`[Directives] ⚠️ clearByType: немає записів для type=${type}`);
            return;
        }

        // 🔐 2. Обробляємо поля перед логуванням
        const toLog = rows.map((row: any) => {
            if (row.file && typeof row.file === 'object') {
                try {
                    row.file = JSON.stringify(row.file);
                } catch (err) {
                    console.warn(
                        `[Directives] ⚠️ Неможливо серіалізувати file для id=${row.id}`,
                        err,
                    );
                    row.file = null;
                }
            }
            return row;
        });

        // 3. Видаляємо записи
        await db.run(`DELETE FROM user_directives WHERE type = ?`, [type]);

        // 4. Логуємо кожне видалення
        for (const row of toLog) {
            try {
                await db.run(
                    `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
                 VALUES (?, ?, ?, ?, ?)`,
                    'user_directives',
                    row.id,
                    'delete',
                    JSON.stringify(row),
                    'local',
                );
            } catch (err) {
                console.warn(`[ChangeHistory] ❌ Помилка при логуванні delete id=${row.id}`, err);
            }
        }
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
