import { database } from '../../db/connection';
import { access, handle } from '../secureHandle';

export function registerTodoHandlers() {
    const rule = access.authenticated;

    handle('fetch-todos', rule, async () => {
        const db = await database.get();
        return db.all('SELECT * FROM todos ORDER BY id DESC');
    });

    handle('add-todos', rule, async (_event, content: string) => {
        const db = await database.get();
        const result = await db.run(
            'INSERT INTO todos (content, completed) VALUES (?, 0)',
            content,
        );
        return db.get('SELECT * FROM todos WHERE id = ?', result.lastID);
    });

    handle('toggle-todos', rule, async (_event, id: number) => {
        const db = await database.get();
        await db.run('UPDATE todos SET completed = NOT completed WHERE id = ?', id);
        return db.get('SELECT * FROM todos WHERE id = ?', id);
    });

    handle('delete-todos', rule, async (_event, id: number) => {
        const db = await database.get();
        await db.run('DELETE FROM todos WHERE id = ?', id);
        return true;
    });
}
