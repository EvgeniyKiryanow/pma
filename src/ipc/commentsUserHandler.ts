import { app, ipcMain } from 'electron';
import { getDb } from '../database/db';
import path from 'path';
import fs from 'fs';
import { convertDocxToPdf } from 'src/main';
import { exec } from 'child_process';

export function registerCommentsHandlers() {
    ipcMain.handle('comments:get-user-comments', async (_event, userId: number) => {
        const db = await getDb();
        const user = await db.get('SELECT comments FROM users WHERE id = ?', userId);
        if (!user || !user.comments) return [];
        return JSON.parse(user.comments);
    });

    ipcMain.handle('comments:add-user-comment', async (_event, userId: number, newComment: any) => {
        const db = await getDb();

        // 1. Отримуємо користувача
        const user = await db.get('SELECT * FROM users WHERE id = ?', userId);
        if (!user) {
            console.warn(`[Users] ⚠️ add-user-comment: користувача з id=${userId} не знайдено`);
            return { success: false, message: 'User not found' };
        }

        // 2. Додаємо коментар
        const existingComments = user.comments ? JSON.parse(user.comments) : [];
        existingComments.push(newComment);

        // 3. Оновлюємо поле comments
        await db.run(
            'UPDATE users SET comments = ? WHERE id = ?',
            JSON.stringify(existingComments),
            userId,
        );

        // 4. Отримуємо оновленого користувача
        const updated = await db.get('SELECT * FROM users WHERE id = ?', userId);

        // 5. Логуємо зміну
        try {
            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'users',
                userId,
                'update',
                JSON.stringify(updated),
                'local',
            );
        } catch (err) {
            console.warn(
                `[ChangeHistory] ❌ Помилка при логуванні доданого коментаря user id=${userId}`,
                err,
            );
        }

        return { success: true };
    });

    ipcMain.handle('comments:delete-user-comment', async (_event, id: number) => {
        const db = await getDb();
        const users = await db.all('SELECT id, comments FROM users');

        for (const user of users) {
            const comments = JSON.parse(user.comments || '[]');
            const updated = comments.filter((entry: any) => entry.id !== id);

            if (updated.length !== comments.length) {
                // 1. Оновлюємо коментарі
                await db.run(
                    'UPDATE users SET comments = ? WHERE id = ?',
                    JSON.stringify(updated),
                    user.id,
                );

                // 2. Отримуємо оновленого користувача
                const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', user.id);

                // 3. Логування зміни
                try {
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
                        `[ChangeHistory] ❌ Помилка при логуванні видалення коментаря для user id=${user.id}`,
                        err,
                    );
                }
            }
        }

        return true;
    });
}
