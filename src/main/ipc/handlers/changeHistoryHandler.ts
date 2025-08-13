import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { dialog, ipcMain } from 'electron';
import fs from 'fs/promises';

import { getDb } from '../../../database/db';

function encryptWithPassword(json: any, password: string): Buffer {
    const iv = randomBytes(12);
    const key = Buffer.from(password.padEnd(32, ' '), 'utf8');
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    const plaintext = Buffer.from(JSON.stringify(json), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]);
}

function decryptWithPassword(buffer: Buffer, password: string): any {
    const iv = buffer.slice(0, 12);
    const tag = buffer.slice(12, 28);
    const encrypted = buffer.slice(28);

    const key = Buffer.from(password.padEnd(32, ' '), 'utf8');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
}

export function registerChangeHistoryHandler() {
    ipcMain.handle('change-history:log', async (_event, change) => {
        const db = await getDb();
        const { table, recordId, operation, data, sourceId } = change;

        if (!table || !recordId || !operation) {
            console.warn('[ChangeHistory] ⚠️ Недостатньо даних для логування зміни:', change);
            return;
        }

        let jsonData: string | null = null;
        try {
            jsonData = data !== undefined ? JSON.stringify(data) : null;
        } catch (err) {
            console.warn('[ChangeHistory] ❌ Неможливо перетворити `data` у JSON:', data, err);
            return;
        }

        try {
            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
                 VALUES (?, ?, ?, ?, ?)`,
                table,
                recordId,
                operation,
                jsonData,
                sourceId ?? null,
            );
        } catch (err) {
            console.warn('[ChangeHistory] ❌ Помилка при логуванні зміни:', change, err);
        }
    });

    ipcMain.handle('change-history:export', async (_e, password: string) => {
        const db = await getDb();
        try {
            const exportSourceId = randomBytes(20).toString('hex').slice(0, 30);
            await db.run(
                `UPDATE change_history SET source_id = ? WHERE source_id IS NULL OR source_id = 'local'`,
                exportSourceId,
            );

            const logs = await db.all(
                `SELECT * FROM change_history WHERE source_id = ? ORDER BY timestamp ASC`,
                exportSourceId,
            );

            if (!logs || logs.length === 0) {
                console.warn('[ChangeHistory] ⚠️ Немає логів для експорту');
                return { exported: 0 };
            }

            if (!password || password.length < 4) {
                console.warn('[ChangeHistory] ❌ Пароль занадто короткий або не вказаний');
                return { exported: 0 };
            }

            const encrypted = encryptWithPassword(logs, password);

            const { canceled, filePath } = await dialog.showSaveDialog({
                title: 'Export Change Log (Encrypted)',
                defaultPath: 'change_log.pmc',
                filters: [{ name: 'Encrypted Logs', extensions: ['pmc'] }],
            });

            if (canceled || !filePath) return { exported: 0 };

            await fs.writeFile(filePath, encrypted);
            await db.run(`DELETE FROM change_history WHERE source_id = ?`, exportSourceId);

            return { exported: logs.length };
        } catch (err) {
            console.warn('[ChangeHistory] ❌ Помилка при експорті:', err);
            return { exported: 0 };
        }
    });

    ipcMain.handle('change-history:import', async (_e, password: string) => {
        const db = await getDb();
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Import Encrypted Change Log',
            filters: [{ name: 'Encrypted Logs', extensions: ['pmc'] }],
            properties: ['openFile'],
        });

        if (canceled || filePaths.length === 0) return { imported: 0 };

        try {
            const buffer = await fs.readFile(filePaths[0]);

            if (!password || password.length < 4) {
                console.warn('[ChangeHistory] ❌ Пароль занадто короткий або не вказаний');
                return { imported: 0 };
            }

            let changes;
            try {
                changes = decryptWithPassword(buffer, password);
            } catch (err) {
                console.warn('[ChangeHistory] ❌ Невірний пароль або файл пошкоджено');
                return { imported: 0, error: 'invalid-password' };
            }

            const importedSourceId = randomBytes(20).toString('hex').slice(0, 30);
            let importedCount = 0;

            for (const change of changes) {
                const { table_name, record_id, operation, timestamp } = change;
                let data: any = change.data;

                if (typeof data === 'string') {
                    try {
                        data = JSON.parse(data);
                    } catch {
                        continue;
                    }
                }

                if (!data || typeof data !== 'object' || !data.id) continue;

                if (table_name === 'user_directives') {
                    if (data.period) {
                        data.period_from = data.period.from || '';
                        data.period_to = data.period.to || '';
                        delete data.period;
                    }
                    if (data.file && typeof data.file === 'object') {
                        data.file = JSON.stringify(data.file);
                    }
                }

                const clean = (v: any) => (v === undefined ? null : v);

                await db.run(
                    `INSERT OR IGNORE INTO change_history (table_name, record_id, operation, data, source_id, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                    table_name,
                    record_id,
                    operation,
                    JSON.stringify(data),
                    importedSourceId,
                    timestamp,
                );

                try {
                    if (operation === 'insert') {
                        const keys = Object.keys(data);
                        const values = keys.map((k) => clean(data[k]));
                        const sql = `INSERT OR IGNORE INTO ${table_name} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
                        const res = await db.run(sql, values);
                        if (res.changes > 0) importedCount++;
                    } else if (operation === 'update') {
                        const keys = Object.keys(data).filter((k) => k !== 'id');
                        const values = keys.map((k) => clean(data[k]));
                        values.push(record_id);
                        const sql = `UPDATE ${table_name} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`;
                        const res = await db.run(sql, values);
                        if (res.changes > 0) importedCount++;
                    } else if (operation === 'delete') {
                        const res = await db.run(`DELETE FROM ${table_name} WHERE id = ?`, [
                            record_id,
                        ]);
                        if (res.changes > 0) importedCount++;
                    }
                } catch (err) {
                    console.warn(
                        `[ChangeHistory] ❌ Помилка застосування ${operation} до ${table_name} id=${record_id}`,
                        err,
                    );
                }
            }

            await db.run(`DELETE FROM change_history WHERE source_id = ?`, importedSourceId);
            return { imported: importedCount };
        } catch (err) {
            console.warn('[ChangeHistory] ❌ Помилка при імпорті:', err);
            return { imported: 0 };
        }
    });
}
