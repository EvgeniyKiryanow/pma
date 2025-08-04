import bcrypt from 'bcryptjs';
import { ipcMain } from 'electron';
import { getDb } from '../../database/db';

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

    ipcMain.handle('auth:superuser-login', async (_event, username: string, password: string) => {
        const db = await getDb();
        const row = await db.get('SELECT * FROM superuser WHERE username = ?', username);
        if (!row) return false;

        const match = await bcrypt.compare(password, row.password);
        return match ? row.key : false;
    });
    ipcMain.handle(
        'auth:default-admin-login',
        async (_event, username: string, password: string) => {
            const db = await getDb();
            const row = await db.get('SELECT * FROM default_admin WHERE username = ?', username);
            if (!row) return false;

            const match = await bcrypt.compare(password, row.password);
            return match ? row.key : false;
        },
    );

    ipcMain.handle('auth:get-auth-users', async () => {
        const db = await getDb();
        const users = await db.all(
            `SELECT id, username, password, recovery_hint, role, key FROM auth_user`,
        );
        return users;
    });

    ipcMain.handle(
        'auth:update-auth-user',
        async (
            _event,
            userId: number,
            updates: Partial<{
                username: string;
                password: string;
                recovery_hint: string;
                role: string;
            }>,
        ) => {
            const db = await getDb();

            const fields: string[] = [];
            const values: any[] = [];

            if (updates.username) {
                fields.push('username = ?');
                values.push(updates.username);
            }

            if (updates.password) {
                const looksHashed =
                    updates.password.startsWith('$2a$') || updates.password.startsWith('$2b$');
                const hashed = looksHashed
                    ? updates.password
                    : await bcrypt.hash(updates.password, 10);
                fields.push('password = ?');
                values.push(hashed);
            }

            if (updates.recovery_hint !== undefined) {
                fields.push('recovery_hint = ?');
                values.push(updates.recovery_hint);
            }

            if (updates.role !== undefined) {
                fields.push('role = ?');
                values.push(updates.role);
            }

            if (fields.length === 0) return false;

            values.push(userId);
            await db.run(`UPDATE auth_user SET ${fields.join(', ')} WHERE id = ?`, values);
            return true;
        },
    );

    ipcMain.handle('auth:get-default-admin', async () => {
        const db = await getDb();
        const admin = await db.get(`
        SELECT id, username, password, recovery_hint, key, app_key 
        FROM default_admin 
        LIMIT 1
    `);
        return admin || null;
    });

    ipcMain.handle(
        'auth:update-default-admin',
        async (
            _event,
            updates: Partial<{ username: string; password: string; recovery_hint: string }>,
        ) => {
            const db = await getDb();

            const fields: string[] = [];
            const values: any[] = [];

            if (updates.username) {
                fields.push('username = ?');
                values.push(updates.username);
            }

            if (updates.password) {
                const looksHashed =
                    updates.password.startsWith('$2a$') || updates.password.startsWith('$2b$');
                const hashed = looksHashed
                    ? updates.password
                    : await bcrypt.hash(updates.password, 10);
                fields.push('password = ?');
                values.push(hashed);
            }

            if (updates.recovery_hint !== undefined) {
                fields.push('recovery_hint = ?');
                values.push(updates.recovery_hint);
            }

            if (fields.length === 0) return false;

            const existing = await db.get('SELECT id FROM default_admin');
            if (!existing) return false;

            values.push(existing.id);
            await db.run(`UPDATE default_admin SET ${fields.join(', ')} WHERE id = ?`, values);
            return true;
        },
    );
}
