import { app, ipcMain } from 'electron';
import { getDb } from '../database/db';
import path from 'path';
import { readFile } from 'fs/promises';
import fs from 'fs';
import { exec } from 'child_process';

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
        await db.run('DELETE FROM shtatni_posady');
        return { success: true };
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

            await db.run(
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
        }

        return { success: true, added: addedCount, skipped: skippedCount, total: positions.length };
    });

    ipcMain.handle('update-shtatni-posada', async (_event, pos: any) => {
        const db = await getDb();

        const existing = await db.get(
            `SELECT shtat_number FROM shtatni_posady WHERE shtat_number = ?`,
            pos.shtat_number,
        );

        if (!existing) {
            return { success: false, message: 'Position not found' };
        }

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

        return { success: true };
    });

    ipcMain.handle('delete-shtatni-posada', async (_event, shtat_number: string) => {
        const db = await getDb();
        const res = await db.run(`DELETE FROM shtatni_posady WHERE shtat_number = ?`, shtat_number);
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

    ipcMain.handle('add-report-template', async (_, name: string, filePath: string) => {
        const db = await getDb();
        await db.run('INSERT INTO report_templates (name, filePath) VALUES (?, ?)', name, filePath);
        return { success: true };
    });

    ipcMain.handle('delete-report-template', async (_, id: number) => {
        const db = await getDb();
        await db.run('DELETE FROM report_templates WHERE id = ?', id);
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
}

ipcMain.handle('read-report-file-buffer', async (_event, filePath: string) => {
    try {
        const buffer = await readFile(filePath);
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    } catch (error) {
        console.error(`Failed to read file at ${filePath}:`, error);
        throw error;
    }
});
