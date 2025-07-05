import bcrypt from 'bcryptjs';
import { ipcMain } from 'electron';
import { getDb } from '../database/db';

export function authUserHandlers() {
    ipcMain.handle('auth:has-user', async () => {
        const db = await getDb();
        const result = await db.get('SELECT COUNT(*) AS count FROM auth_user');
        return result.count > 0;
    });

    ipcMain.handle('auth:register', async (_event, username, password, hint) => {
        const db = await getDb();
        const hashed = await bcrypt.hash(password, 10);
        await db.run(
            'INSERT INTO auth_user (username, password, recovery_hint) VALUES (?, ?, ?)',
            username,
            hashed,
            hint,
        );
        return true;
    });

    ipcMain.handle('auth:login', async (_event, username, password) => {
        const db = await getDb();
        const row = await db.get('SELECT * FROM auth_user WHERE username = ?', username);
        if (!row) return false;
        return await bcrypt.compare(password, row.password);
    });

    ipcMain.handle('auth:get-recovery-hint', async (_event, username) => {
        const db = await getDb();
        const row = await db.get(
            'SELECT recovery_hint FROM auth_user WHERE username = ?',
            username,
        );
        return row?.recovery_hint ?? null;
    });

    ipcMain.handle('auth:reset-password', async (_event, username, hint, newPassword) => {
        const db = await getDb();
        const row = await db.get('SELECT * FROM auth_user WHERE username = ?', username);
        if (!row || row.recovery_hint !== hint) return false;

        const hashed = await bcrypt.hash(newPassword, 10);
        await db.run('UPDATE auth_user SET password = ? WHERE username = ?', hashed, username);
        return true;
    });
}
