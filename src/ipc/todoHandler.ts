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
}
