import { app, ipcMain } from 'electron';
import { getDb } from '../database/db';
import path from 'path';
import { readFile } from 'fs/promises';
import fs from 'fs';
import { convertDocxToPdf } from 'src/main';
import { exec } from 'child_process';
import { promises } from 'dns';

export function registerReportsHandlers() {
    function getTemplatesDir(): string {
        if (app.isPackaged) {
            // In packaged app → unpacked assets folder
            return path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'templates');
        } else {
            // In development → project src folder
            return path.join(__dirname, '..', 'build', 'assets', 'templates');
        }
    }
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
                content: content.buffer, // <-- keep ArrayBuffer for frontend
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
        const templates = await db.all('SELECT * FROM report_templates ORDER BY createdAt DESC');
        return templates;
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
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength); // ensure proper ArrayBuffer
    } catch (error) {
        console.error(`Failed to read file at ${filePath}:`, error);
        throw error;
    }
});
