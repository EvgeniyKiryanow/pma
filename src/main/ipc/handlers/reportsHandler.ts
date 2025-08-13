import { exec } from 'child_process';
import { app, ipcMain } from 'electron';
import fs from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

import { getDb } from '../../../database/db';

export function registerReportsHandlers() {
    function getTemplatesDir(): string {
        if (app.isPackaged) {
            return path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'templates');
        } else {
            return path.join(__dirname, '..', 'build', 'assets', 'templates');
        }
    }

    ipcMain.handle('delete-all-shtatni-posady', async () => {
        const db = await getDb();

        // 1. Отримуємо всі записи перед видаленням
        const rows = await db.all('SELECT * FROM shtatni_posady');

        if (!rows || rows.length === 0) {
            console.warn('[ShtatniPosady] ⚠️ Немає записів для видалення');
            return { success: true, deleted: 0 };
        }

        // 2. Видаляємо всі записи
        await db.run('DELETE FROM shtatni_posady');

        // 3. Логуємо кожен запис
        for (const row of rows) {
            try {
                await db.run(
                    `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
                 VALUES (?, ?, ?, ?, ?)`,
                    'shtatni_posady',
                    row.id,
                    'delete',
                    JSON.stringify(row),
                    'local',
                );
            } catch (err) {
                console.warn(`[ChangeHistory] ❌ Помилка при логуванні delete id=${row.id}`, err);
            }
        }

        return { success: true, deleted: rows.length };
    });

    ipcMain.handle('fetch-shtatni-posady', async () => {
        const db = await getDb();
        const rows = await db.all('SELECT * FROM shtatni_posady ORDER BY shtat_number ASC');

        return rows.map((row: any) => {
            let parsedExtra = {};
            try {
                parsedExtra = row.extra_data ? JSON.parse(row.extra_data) : {};
            } catch (e) {
                console.warn('⚠️ Failed to parse extra_data for', row.shtat_number, row.extra_data);
            }

            return {
                ...row,
                extra_data: parsedExtra,
            };
        });
    });

    ipcMain.handle('import-shtatni-posady', async (_event, positions: any[]) => {
        const db = await getDb();

        let addedCount = 0;
        let skippedCount = 0;

        for (const pos of positions) {
            const existing = await db.get(
                `SELECT shtat_number FROM shtatni_posady WHERE shtat_number = ?`,
                pos.shtat_number,
            );

            if (existing) {
                skippedCount++;
                continue;
            }

            const res = await db.run(
                `INSERT INTO shtatni_posady 
             (shtat_number, unit_name, position_name, category, shpk_code, extra_data)
             VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    pos.shtat_number,
                    pos.unit_name ?? '',
                    pos.position_name ?? '',
                    pos.category ?? '',
                    pos.shpk_code ?? '',
                    JSON.stringify(pos.extra_data ?? {}),
                ],
            );
            addedCount++;

            // 🔐 Логування доданого запису
            try {
                const inserted = {
                    id: res.lastID,
                    shtat_number: pos.shtat_number,
                    unit_name: pos.unit_name ?? '',
                    position_name: pos.position_name ?? '',
                    category: pos.category ?? '',
                    shpk_code: pos.shpk_code ?? '',
                    extra_data: pos.extra_data ?? {},
                };

                await db.run(
                    `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
                 VALUES (?, ?, ?, ?, ?)`,
                    'shtatni_posady',
                    inserted.id,
                    'insert',
                    JSON.stringify(inserted),
                    'local',
                );
            } catch (err) {
                console.warn(
                    `[ChangeHistory] ❌ Помилка при логуванні insert shtat_number=${pos.shtat_number}`,
                    err,
                );
            }
        }

        return { success: true, added: addedCount, skipped: skippedCount, total: positions.length };
    });

    ipcMain.handle('update-shtatni-posada', async (_event, pos: any) => {
        const db = await getDb();

        const existing = await db.get(
            `SELECT * FROM shtatni_posady WHERE shtat_number = ?`,
            pos.shtat_number,
        );

        if (!existing) {
            return { success: false, message: 'Position not found' };
        }

        // 1. Оновлення
        await db.run(
            `UPDATE shtatni_posady 
         SET unit_name = ?, position_name = ?, category = ?, shpk_code = ?, extra_data = ?
         WHERE shtat_number = ?`,
            [
                pos.unit_name ?? '',
                pos.position_name ?? '',
                pos.category ?? '',
                pos.shpk_code ?? '',
                JSON.stringify(pos.extra_data ?? {}),
                pos.shtat_number,
            ],
        );

        // 2. Отримати оновлений запис
        const updated = await db.get(
            `SELECT * FROM shtatni_posady WHERE shtat_number = ?`,
            pos.shtat_number,
        );

        // 3. Логування зміни
        try {
            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'shtatni_posady',
                updated.id,
                'update',
                JSON.stringify(updated),
                'local',
            );
        } catch (err) {
            console.warn(
                `[ChangeHistory] ❌ Помилка при логуванні update shtat_number=${pos.shtat_number}`,
                err,
            );
        }

        return { success: true };
    });

    ipcMain.handle('delete-shtatni-posada', async (_event, shtat_number: string) => {
        const db = await getDb();

        // 1. Отримуємо запис перед видаленням
        const row = await db.get(
            `SELECT * FROM shtatni_posady WHERE shtat_number = ?`,
            shtat_number,
        );

        if (!row) {
            console.warn(
                `[ShtatniPosady] ⚠️ delete: запис з shtat_number=${shtat_number} не знайдено`,
            );
            return { success: false };
        }

        // 2. Видаляємо
        const res = await db.run(`DELETE FROM shtatni_posady WHERE shtat_number = ?`, shtat_number);

        // 3. Логуємо
        try {
            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'shtatni_posady',
                row.id,
                'delete',
                JSON.stringify(row),
                'local',
            );
        } catch (err) {
            console.warn(
                `[ChangeHistory] ❌ Помилка при логуванні delete shtat_number=${shtat_number}`,
                err,
            );
        }

        return { success: res.changes > 0 };
    });

    // === Other existing handlers for reports ===
    ipcMain.handle('get-all-report-templates', async () => {
        const templatesDir = getTemplatesDir();

        if (!fs.existsSync(templatesDir)) {
            console.warn('⚠️ Templates directory not found:', templatesDir);
            return [];
        }

        const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.docx'));

        return files.map((file) => {
            const fullPath = path.join(templatesDir, file);
            const content = fs.readFileSync(fullPath);

            return {
                id: file,
                name: path.basename(file, '.docx'),
                timestamp: fs.statSync(fullPath).mtimeMs,
                content: content.buffer,
            };
        });
    });

    ipcMain.handle('convert-docx-to-pdf', async (_, buffer: ArrayBuffer, fileName: string) => {
        const tempDir = path.join(app.getPath('temp'), 'docx-previews');
        fs.mkdirSync(tempDir, { recursive: true });

        const docxPath = path.join(tempDir, fileName);
        const pdfPath = docxPath.replace(/\.docx$/, '.pdf');

        fs.writeFileSync(docxPath, Buffer.from(buffer));

        return new Promise<string>((resolve, reject) => {
            const cmd = `soffice --headless --convert-to pdf --outdir "${tempDir}" "${docxPath}"`;
            exec(cmd, (err: any) => {
                if (err || !fs.existsSync(pdfPath)) {
                    reject(err || 'PDF not created');
                    return;
                }
                resolve(pdfPath);
            });
        });
    });

    ipcMain.handle('add-report-template', async (_event, name: string, filePath: string) => {
        const db = await getDb();

        // 1. Вставка шаблону
        const res = await db.run(
            'INSERT INTO report_templates (name, filePath) VALUES (?, ?)',
            name,
            filePath,
        );

        // 2. Логування зміни
        try {
            const inserted = {
                id: res.lastID,
                name,
                filePath,
            };

            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'report_templates',
                inserted.id,
                'insert',
                JSON.stringify(inserted),
                'local',
            );
        } catch (err) {
            console.warn(`[ChangeHistory] ❌ Помилка при логуванні insert шаблону ${name}`, err);
        }

        return { success: true };
    });

    ipcMain.handle('delete-report-template', async (_event, id: number) => {
        const db = await getDb();

        // 1. Отримуємо шаблон перед видаленням
        const row = await db.get('SELECT * FROM report_templates WHERE id = ?', id);

        if (!row) {
            console.warn(`[ReportTemplates] ⚠️ delete: шаблон з id=${id} не знайдено`);
            return { success: false };
        }

        // 2. Видаляємо
        await db.run('DELETE FROM report_templates WHERE id = ?', id);

        // 3. Логуємо видалення
        try {
            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'report_templates',
                row.id,
                'delete',
                JSON.stringify(row),
                'local',
            );
        } catch (err) {
            console.warn(`[ChangeHistory] ❌ Помилка при логуванні delete шаблону id=${id}`, err);
        }

        return { success: true };
    });

    ipcMain.handle('get-all-report-templates-from-db', async () => {
        const db = await getDb();
        return await db.all('SELECT * FROM report_templates ORDER BY createdAt DESC');
    });

    ipcMain.handle('save-report-file-to-disk', async (_, buffer: ArrayBuffer, name: string) => {
        try {
            const reportsDir = path.join(app.getPath('userData'), 'reports');
            const filePath = path.join(reportsDir, name);

            fs.mkdirSync(reportsDir, { recursive: true });
            fs.writeFileSync(filePath, Buffer.from(buffer));

            return filePath;
        } catch (err) {
            console.error('Failed to save report file to disk:', err);
            throw err;
        }
    });

    ipcMain.handle('read-report-file-buffer', async (_event, filePath: string) => {
        try {
            const buffer = await readFile(filePath);
            return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        } catch (error) {
            console.error(`Failed to read file at ${filePath}:`, error);
            throw error;
        }
    });

    // іменний список
    ipcMain.handle('named-list:create', async (_event, key: string, data: any) => {
        const db = await getDb();

        const exists = await db.get(`SELECT 1 FROM named_list_tables WHERE key = ?`, key);
        if (exists) {
            console.warn(`[NamedList] ⚠️ Table with key=${key} already exists`);
            return { success: false, message: 'Table already exists' };
        }

        await db.run(
            `INSERT INTO named_list_tables (key, data) VALUES (?, ?)`,
            key,
            JSON.stringify(data),
        );

        try {
            const fullEntry = {
                key,
                data,
            };

            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'named_list_tables',
                key,
                'insert',
                JSON.stringify(fullEntry),
                'local',
            );
        } catch (err) {
            console.warn(`[NamedList] ❌ Logging insert failed for key=${key}`, err);
        }

        return { success: true };
    });

    ipcMain.handle(
        'named-list:update-cell',
        async (_event, key: string, rowId: number, dayIndex: number, value: string) => {
            const db = await getDb();
            const row = await db.get(`SELECT data FROM named_list_tables WHERE key = ?`, key);
            if (!row) return { success: false, message: 'Table not found' };

            const data = JSON.parse(row.data);
            const rowToUpdate = data.find((r: any) => r.id === rowId);
            if (!rowToUpdate) return { success: false, message: 'Row not found' };

            rowToUpdate.attendance[dayIndex] = value;

            await db.run(
                `UPDATE named_list_tables SET data = ? WHERE key = ?`,
                JSON.stringify(data),
                key,
            );

            try {
                const fullEntry = {
                    key,
                    updatedRowId: rowId,
                    updatedDayIndex: dayIndex,
                    newValue: value,
                    fullData: data,
                };

                await db.run(
                    `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
                 VALUES (?, ?, ?, ?, ?)`,
                    'named_list_tables',
                    key,
                    'update',
                    JSON.stringify(fullEntry),
                    'local',
                );
            } catch (err) {
                console.warn(`[NamedList] ❌ Logging update failed for key=${key}`, err);
            }

            return { success: true };
        },
    );
    ipcMain.handle('named-list:delete', async (_event, key: string) => {
        const db = await getDb();

        const row = await db.get(`SELECT data FROM named_list_tables WHERE key = ?`, key);
        if (!row) {
            console.warn(`[NamedList] ⚠️ delete: no data for key=${key}`);
            return { success: false };
        }

        await db.run(`DELETE FROM named_list_tables WHERE key = ?`, key);

        try {
            const fullEntry = {
                key,
                data: JSON.parse(row.data),
            };

            await db.run(
                `INSERT INTO change_history (table_name, record_id, operation, data, source_id)
             VALUES (?, ?, ?, ?, ?)`,
                'named_list_tables',
                key,
                'delete',
                JSON.stringify(fullEntry),
                'local',
            );
        } catch (err) {
            console.warn(`[NamedList] ❌ Logging delete failed for key=${key}`, err);
        }

        return { success: true };
    });

    ipcMain.handle('named-list:get-all', async () => {
        const db = await getDb();
        const rows = await db.all(`SELECT * FROM named_list_tables`);
        return rows.map((r: any) => ({ key: r.key, data: JSON.parse(r.data) }));
    });
}
