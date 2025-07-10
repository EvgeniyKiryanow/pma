import { app, ipcMain } from 'electron';
import { getDb } from '../database/db';
import path from 'path';
import fs from 'fs';
import { convertDocxToPdf } from 'src/main';
import { exec } from 'child_process';

export function registerTodoHandlers() {
    ipcMain.handle('fetch-todos', async () => {
        const db = await getDb();
        const rows = await db.all('SELECT * FROM todos ORDER BY id DESC');
        return rows;
    });

    ipcMain.handle('add-todos', async (_event, content: string) => {
        const db = await getDb();
        const result = await db.run(
            'INSERT INTO todos (content, completed) VALUES (?, ?)',
            content,
            false,
        );
        const newTodo = await db.get('SELECT * FROM todos WHERE id = ?', result.lastID);
        return newTodo;
    });

    ipcMain.handle('toggle-todos', async (_event, id: number) => {
        const db = await getDb();
        await db.run('UPDATE todos SET completed = NOT completed WHERE id = ?', id);
        const updated = await db.get('SELECT * FROM todos WHERE id = ?', id);
        return updated;
    });

    ipcMain.handle('delete-todos', async (_event, id: number) => {
        const db = await getDb();
        await db.run('DELETE FROM todos WHERE id = ?', id);
        return true;
    });
    ipcMain.handle('get-all-report-templates', async () => {
        const templatesDir = path.join(app.getPath('userData'), 'templates');
        if (!fs.existsSync(templatesDir)) {
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
}
