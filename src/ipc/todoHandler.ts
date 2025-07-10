import { app, ipcMain } from 'electron';
import { getDb } from '../database/db';
import path from 'path';
import fs from 'fs';

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
    ipcMain.handle('get-default-report-template', async () => {
        const filePath = path.join(app.getPath('userData'), 'templates/Картка-данних.docx');

        if (!fs.existsSync(filePath)) {
            throw new Error('Template file not found at: ' + filePath);
        }

        const content = fs.readFileSync(filePath);
        return {
            id: '1234',
            name: 'Картка Данних',
            timestamp: Date.now(),
            content: content.buffer, // ArrayBuffer for renderer
        };
    });
}
