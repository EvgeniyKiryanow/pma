import { ipcMain, dialog } from 'electron';
import fs from 'fs/promises';
import { getDb } from '../database/db';

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

    ipcMain.handle('change-history:import', async () => {
        const db = await getDb();
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Import Change Log',
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile'],
        });

        if (canceled || filePaths.length === 0) return { imported: 0 };

        try {
            const content = await fs.readFile(filePaths[0], 'utf-8');
            const changes = JSON.parse(content);
            let importedCount = 0;

            for (const change of changes) {
                const { table_name, record_id, operation, timestamp, source_id } = change;
                let data: any = change.data;

                if (typeof data === 'string') {
                    try {
                        data = JSON.parse(data);
                    } catch (err) {
                        console.warn('[ChangeHistory] ❌ Неможливо розпарсити `data`:', data);
                        continue;
                    }
                }

                if (!data || typeof data !== 'object' || !data.id) {
                    console.warn(
                        '[ChangeHistory] ❌ Пропущено — некоректні `data` або `id`:',
                        change,
                    );
                    continue;
                }

                // Map period
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

                const cleanValue = (v: any) => (v === undefined ? null : v);

                await db.run(
                    `INSERT OR IGNORE INTO change_history (table_name, record_id, operation, data, source_id, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    table_name,
                    record_id,
                    operation,
                    JSON.stringify(data),
                    source_id ?? null,
                    timestamp,
                );

                try {
                    if (operation === 'insert') {
                        const columns = Object.keys(data);
                        const placeholders = columns.map(() => '?').join(', ');
                        const values = columns.map((k) => cleanValue(data[k]));

                        const result = await db.run(
                            `INSERT OR IGNORE INTO ${table_name} (${columns.join(', ')}) VALUES (${placeholders})`,
                            values,
                        );

                        if (result.changes > 0) importedCount++;
                        else
                            console.warn(
                                `[ChangeHistory] ⚠️ Insert пропущено — запис з id=${record_id} вже існує у ${table_name}`,
                            );
                    } else if (operation === 'update') {
                        const keys = Object.keys(data).filter((k) => k !== 'id');
                        const setClause = keys.map((k) => `${k} = ?`).join(', ');
                        const values = keys.map((k) => cleanValue(data[k]));
                        values.push(record_id);

                        const result = await db.run(
                            `UPDATE ${table_name} SET ${setClause} WHERE id = ?`,
                            values,
                        );

                        if (result.changes > 0) importedCount++;
                        else
                            console.warn(
                                `[ChangeHistory] ⚠️ Update пропущено — запис з id=${record_id} не знайдено у ${table_name}`,
                            );
                    } else if (operation === 'delete') {
                        const result = await db.run(`DELETE FROM ${table_name} WHERE id = ?`, [
                            record_id,
                        ]);

                        if (result.changes > 0) importedCount++;
                        else
                            console.warn(
                                `[ChangeHistory] ⚠️ Delete пропущено — запис з id=${record_id} не знайдено у ${table_name}`,
                            );
                    } else {
                        console.warn(`[ChangeHistory] ❌ Невідома операція: ${operation}`, change);
                    }
                } catch (err) {
                    console.warn(
                        `[ChangeHistory] ❌ Помилка застосування ${operation} у ${table_name} id=${record_id}`,
                        err,
                    );
                }
            }

            return { imported: importedCount };
        } catch (err) {
            console.warn('[ChangeHistory] ❌ Помилка при імпорті:', err);
            return { imported: 0 };
        }
    });

    ipcMain.handle('change-history:export', async () => {
        const db = await getDb();
        try {
            const logs = await db.all(`SELECT * FROM change_history ORDER BY timestamp ASC`);
            const { canceled, filePath } = await dialog.showSaveDialog({
                title: 'Export Change Log',
                defaultPath: 'change_log.json',
                filters: [{ name: 'JSON', extensions: ['json'] }],
            });

            if (canceled || !filePath) return { exported: 0 };

            await fs.writeFile(filePath, JSON.stringify(logs, null, 2), 'utf-8');
            return { exported: logs.length };
        } catch (err) {
            console.warn('[ChangeHistory] ❌ Помилка при експорті:', err);
            return { exported: 0 };
        }
    });
}
