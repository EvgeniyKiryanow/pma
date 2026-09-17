import { execFile } from 'child_process';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

import { AppPaths, resolveInside, safeFileName } from '../../core/paths';
import { database } from '../../db/connection';
import { access, handle } from '../secureHandle';
import { logChange } from './changeLog';

function parseExtraData(row: any): Record<string, unknown> {
    try {
        return row.extra_data ? JSON.parse(row.extra_data) : {};
    } catch {
        return {};
    }
}

/** Uploaded templates are always addressed by file name inside AppPaths.reports. */
function reportFilePath(fileNameOrLegacyPath: string): string {
    return resolveInside(AppPaths.reports, safeFileName(fileNameOrLegacyPath));
}

export function registerReportsHandlers() {
    registerStaffingHandlers();
    registerTemplateHandlers();
    registerNamedListHandlers();
}

// ---------------------------------------------------------------- Штатні посади (БЧС)

function registerStaffingHandlers() {
    const edit = access.any('staffing.edit');

    handle('fetch-shtatni-posady', access.any('staffing.view'), async () => {
        const db = await database.get();
        const rows = await db.all('SELECT * FROM shtatni_posady ORDER BY shtat_number ASC');
        return rows.map((row: any) => ({ ...row, extra_data: parseExtraData(row) }));
    });

    handle(
        'import-shtatni-posady',
        edit,
        async (_event, positions: any[]) => {
            let added = 0;
            let skipped = 0;
            await database.transaction(async (db) => {
                for (const pos of positions ?? []) {
                    const exists = await db.get(
                        `SELECT 1 FROM shtatni_posady WHERE shtat_number = ?`,
                        pos.shtat_number,
                    );
                    if (exists) {
                        skipped++;
                        continue;
                    }
                    const res = await db.run(
                        `INSERT INTO shtatni_posady (shtat_number, unit_name, position_name, category, shpk_code, extra_data)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        pos.shtat_number,
                        pos.unit_name ?? '',
                        pos.position_name ?? '',
                        pos.category ?? '',
                        pos.shpk_code ?? '',
                        JSON.stringify(pos.extra_data ?? {}),
                    );
                    added++;
                    const inserted = await db.get(
                        'SELECT * FROM shtatni_posady WHERE id = ?',
                        res.lastID,
                    );
                    await logChange(db, 'shtatni_posady', Number(res.lastID), 'insert', {
                        ...inserted,
                        extra_data: parseExtraData(inserted),
                    });
                }
            });
            return { success: true, added, skipped, total: positions?.length ?? 0 };
        },
        { audit: 'staffing.import' },
    );

    handle(
        'update-shtatni-posada',
        edit,
        async (_event, pos: any) => {
            return database.transaction(async (db) => {
                const existing = await db.get(
                    `SELECT id FROM shtatni_posady WHERE shtat_number = ?`,
                    pos.shtat_number,
                );
                if (!existing) return { success: false, message: 'Position not found' };

                await db.run(
                    `UPDATE shtatni_posady SET unit_name = ?, position_name = ?, category = ?, shpk_code = ?, extra_data = ?
                     WHERE shtat_number = ?`,
                    pos.unit_name ?? '',
                    pos.position_name ?? '',
                    pos.category ?? '',
                    pos.shpk_code ?? '',
                    JSON.stringify(pos.extra_data ?? {}),
                    pos.shtat_number,
                );
                const updated = await db.get(
                    `SELECT * FROM shtatni_posady WHERE id = ?`,
                    existing.id,
                );
                await logChange(db, 'shtatni_posady', existing.id, 'update', updated);
                return { success: true };
            });
        },
        { audit: 'staffing.update' },
    );

    handle(
        'delete-shtatni-posada',
        edit,
        async (_event, shtatNumber: string) => {
            return database.transaction(async (db) => {
                const row = await db.get(
                    `SELECT * FROM shtatni_posady WHERE shtat_number = ?`,
                    shtatNumber,
                );
                if (!row) return { success: false };
                await db.run(`DELETE FROM shtatni_posady WHERE id = ?`, row.id);
                await logChange(db, 'shtatni_posady', row.id, 'delete', row);
                return { success: true };
            });
        },
        { audit: 'staffing.delete' },
    );

    handle(
        'delete-all-shtatni-posady',
        edit,
        async () => {
            return database.transaction(async (db) => {
                const rows = await db.all('SELECT * FROM shtatni_posady');
                await db.run('DELETE FROM shtatni_posady');
                for (const row of rows)
                    await logChange(db, 'shtatni_posady', row.id, 'delete', row);
                return { success: true, deleted: rows.length };
            });
        },
        { audit: 'staffing.delete-all' },
    );
}

// ---------------------------------------------------------------- DOCX templates & reports

function registerTemplateHandlers() {
    const view = access.any('reports.view');
    const manage = access.any('reports.templates');

    /** Bundled templates shipped with the app. */
    handle('get-all-report-templates', view, async () => {
        const dir = AppPaths.bundledTemplates;
        if (!fs.existsSync(dir)) return [];
        const files = (await fsp.readdir(dir)).filter((f) => f.endsWith('.docx'));
        return Promise.all(
            files.map(async (file) => {
                const fullPath = path.join(dir, file);
                const [content, stat] = await Promise.all([
                    fsp.readFile(fullPath),
                    fsp.stat(fullPath),
                ]);
                return {
                    id: file,
                    name: path.basename(file, '.docx'),
                    timestamp: stat.mtimeMs,
                    content: content.buffer.slice(
                        content.byteOffset,
                        content.byteOffset + content.byteLength,
                    ),
                };
            }),
        );
    });

    /** Preview through LibreOffice when it is installed. Arguments are passed without a shell. */
    handle('convert-docx-to-pdf', view, async (_event, buffer: ArrayBuffer, fileName: string) => {
        const tempDir = path.join(AppPaths.temp, 'docx-previews');
        await fsp.mkdir(tempDir, { recursive: true });
        const docxPath = resolveInside(tempDir, safeFileName(fileName));
        const pdfPath = docxPath.replace(/\.docx$/i, '.pdf');
        await fsp.writeFile(docxPath, Buffer.from(buffer));

        return new Promise<string>((resolve, reject) => {
            execFile(
                'soffice',
                ['--headless', '--convert-to', 'pdf', '--outdir', tempDir, docxPath],
                { windowsHide: true, timeout: 60_000 },
                (err) => {
                    if (err || !fs.existsSync(pdfPath)) reject(err || new Error('PDF not created'));
                    else resolve(pdfPath);
                },
            );
        });
    });

    handle(
        'save-report-file-to-disk',
        manage,
        async (_event, buffer: ArrayBuffer, name: string) => {
            await fsp.mkdir(AppPaths.reports, { recursive: true });
            const fileName = safeFileName(name);
            await fsp.writeFile(reportFilePath(fileName), Buffer.from(buffer));
            return fileName;
        },
        { audit: 'reports.upload-template' },
    );

    handle(
        'add-report-template',
        manage,
        async (_event, name: string, filePath: string) => {
            const fileName = safeFileName(filePath);
            await database.transaction(async (db) => {
                const res = await db.run(
                    'INSERT INTO report_templates (name, filePath) VALUES (?, ?)',
                    name,
                    fileName,
                );
                const inserted = await db.get(
                    'SELECT * FROM report_templates WHERE id = ?',
                    res.lastID,
                );
                await logChange(db, 'report_templates', Number(res.lastID), 'insert', inserted);
            });
            return { success: true };
        },
        { audit: 'reports.add-template' },
    );

    handle(
        'delete-report-template',
        manage,
        async (_event, id: number) => {
            const row = await database.transaction(async (db) => {
                const existing = await db.get('SELECT * FROM report_templates WHERE id = ?', id);
                if (!existing) return null;
                await db.run('DELETE FROM report_templates WHERE id = ?', id);
                await logChange(db, 'report_templates', existing.id, 'delete', existing);
                return existing;
            });
            if (!row) return { success: false };

            const db = await database.get();
            const stillUsed = await db.get(
                'SELECT 1 FROM report_templates WHERE filePath = ?',
                row.filePath,
            );
            if (!stillUsed)
                await fsp.rm(reportFilePath(row.filePath), { force: true }).catch(() => undefined);
            return { success: true };
        },
        { audit: 'reports.delete-template' },
    );

    handle('get-all-report-templates-from-db', view, async () => {
        const db = await database.get();
        return db.all('SELECT * FROM report_templates ORDER BY createdAt DESC');
    });

    handle('read-report-file-buffer', view, async (_event, filePath: string) => {
        const buffer = await fsp.readFile(reportFilePath(filePath));
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    });
}

// ---------------------------------------------------------------- Named list (іменний список / табель)

function registerNamedListHandlers() {
    const edit = access.any('tables.edit');

    handle(
        'named-list:create',
        edit,
        async (_event, key: string, data: any) => {
            return database.transaction(async (db) => {
                const exists = await db.get(`SELECT 1 FROM named_list_tables WHERE key = ?`, key);
                if (exists) return { success: false, message: 'Table already exists' };
                await db.run(
                    `INSERT INTO named_list_tables (key, data) VALUES (?, ?)`,
                    key,
                    JSON.stringify(data),
                );
                await logChange(db, 'named_list_tables', key, 'insert', { key, data });
                return { success: true };
            });
        },
        { audit: 'tables.named-list-create' },
    );

    handle(
        'named-list:update-cell',
        edit,
        async (_event, key: string, rowId: number, dayIndex: number, value: string) => {
            return database.transaction(async (db) => {
                const row = await db.get(`SELECT data FROM named_list_tables WHERE key = ?`, key);
                if (!row) return { success: false, message: 'Table not found' };

                const data = JSON.parse(row.data);
                const target = data.find((r: any) => r.id === rowId);
                if (!target) return { success: false, message: 'Row not found' };
                target.attendance[dayIndex] = value;

                await db.run(
                    `UPDATE named_list_tables SET data = ? WHERE key = ?`,
                    JSON.stringify(data),
                    key,
                );
                await logChange(db, 'named_list_tables', key, 'update', {
                    key,
                    updatedRowId: rowId,
                    updatedDayIndex: dayIndex,
                    newValue: value,
                    fullData: data,
                });
                return { success: true };
            });
        },
    );

    handle(
        'named-list:delete',
        edit,
        async (_event, key: string) => {
            return database.transaction(async (db) => {
                const row = await db.get(`SELECT data FROM named_list_tables WHERE key = ?`, key);
                if (!row) return { success: false };
                await db.run(`DELETE FROM named_list_tables WHERE key = ?`, key);
                await logChange(db, 'named_list_tables', key, 'delete', {
                    key,
                    data: JSON.parse(row.data),
                });
                return { success: true };
            });
        },
        { audit: 'tables.named-list-delete' },
    );

    handle('named-list:get-all', access.any('tables.view'), async () => {
        const db = await database.get();
        const rows = await db.all(`SELECT key, data FROM named_list_tables`);
        return rows.map((r: any) => ({ key: r.key, data: JSON.parse(r.data) }));
    });
}
