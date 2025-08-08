import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ipcMain } from 'electron';

import { getDb } from '../../database/db';

function normUsername(u: string) {
    return String(u || '')
        .trim()
        .toLowerCase();
}
function genKey() {
    return crypto.randomBytes(24).toString('hex'); // 48 hex символів
}

export function authUserHandlers() {
    ipcMain.handle('auth:has-user', async () => {
        const db = await getDb();
        const result = await db.get('SELECT COUNT(*) AS count FROM auth_user');
        return result.count > 0;
    });

    ipcMain.handle('auth:register', async (_event, username, password, hint) => {
        const db = await getDb();
        const u = normUsername(username);
        const hashed = await bcrypt.hash(password, 10);
        try {
            await db.run(
                'INSERT INTO auth_user (username, password, recovery_hint, role, key) VALUES (?, ?, ?, ?, ?)',
                u,
                hashed,
                hint ?? '',
                'user',
                genKey(),
            );
            return true;
        } catch (e: any) {
            if ((e.message || '').includes('UNIQUE')) return false;
            return false;
        }
    });

    ipcMain.handle('auth:login', async (_event, username, password) => {
        const db = await getDb();
        const u = normUsername(username);
        const row = await db.get('SELECT * FROM auth_user WHERE username = ?', u);
        if (!row) return false;
        return await bcrypt.compare(password, row.password);
    });

    ipcMain.handle('auth:get-recovery-hint', async (_event, username) => {
        const db = await getDb();
        const u = normUsername(username);
        const row = await db.get('SELECT recovery_hint FROM auth_user WHERE username = ?', u);
        return row?.recovery_hint ?? null;
    });

    ipcMain.handle('auth:reset-password', async (_event, username, hint, newPassword) => {
        const db = await getDb();
        const u = normUsername(username);
        const row = await db.get('SELECT * FROM auth_user WHERE username = ?', u);
        if (!row || row.recovery_hint !== hint) return false;
        const hashed = await bcrypt.hash(newPassword, 10);
        await db.run('UPDATE auth_user SET password = ? WHERE username = ?', hashed, u);
        return true;
    });

    ipcMain.handle('auth:superuser-login', async (_event, username: string, password: string) => {
        const db = await getDb();
        const u = normUsername(username);
        const row = await db.get('SELECT * FROM superuser WHERE username = ?', u);
        if (!row) return false;
        const match = await bcrypt.compare(password, row.password);
        return match ? row.key : false;
    });

    ipcMain.handle(
        'auth:default-admin-login',
        async (_event, username: string, password: string) => {
            const db = await getDb();
            const u = normUsername(username);
            const row = await db.get('SELECT * FROM default_admin WHERE username = ?', u);
            if (!row) return false;
            const match = await bcrypt.compare(password, row.password);
            return match ? row.key : false;
        },
    );

    // ⚠️ важливо: не віддаємо password у Renderer
    ipcMain.handle('auth:get-auth-users', async () => {
        const db = await getDb();
        return await db.all(`SELECT id, username, recovery_hint, role, key FROM auth_user`);
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

            if (typeof updates.username === 'string') {
                const u = normUsername(updates.username);
                fields.push('username = ?');
                values.push(u);
            }

            if (typeof updates.password === 'string' && updates.password.length > 0) {
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
                values.push(updates.recovery_hint ?? '');
            }

            if (updates.role !== undefined) {
                if (!['user', 'admin'].includes(updates.role)) return false;
                fields.push('role = ?');
                values.push(updates.role);
            }

            if (!fields.length) return false;

            values.push(userId);
            try {
                await db.run(`UPDATE auth_user SET ${fields.join(', ')} WHERE id = ?`, values);
                return true;
            } catch (e: any) {
                if ((e.message || '').includes('UNIQUE')) return false;
                return false;
            }
        },
    );

    ipcMain.handle('auth:login-any', async (_event, username: string, password: string) => {
        const db = await getDb();
        const u = normUsername(username);

        // 1) default_admin має пріоритет (по збігу username)
        const da = await db.get(
            'SELECT id, username, password, key, app_key FROM default_admin ORDER BY id ASC LIMIT 1',
        );
        if (da && normUsername(da.username) === u) {
            const ok = await bcrypt.compare(password, da.password);
            return ok
                ? {
                      ok: true,
                      role: 'default_admin',
                      key: da.key ?? null,
                      app_key: da.app_key ?? null,
                      user: { id: da.id, username: da.username },
                  }
                : { ok: false };
        }

        // 2) звичайні користувачі
        const au = await db.get(
            'SELECT id, username, password, role, key FROM auth_user WHERE username = ?',
            u,
        );
        if (!au) return { ok: false };

        const ok = await bcrypt.compare(password, au.password);
        if (!ok) return { ok: false };

        return {
            ok: true,
            role: au.role ?? 'user',
            key: au.key ?? null,
            user: { id: au.id, username: au.username },
        };
    });

    ipcMain.handle('auth:get-default-admin', async () => {
        const db = await getDb();
        const admin = await db.get(`
      SELECT id, username, recovery_hint, key, app_key
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

            if (typeof updates.username === 'string' && updates.username.trim().length > 0) {
                fields.push('username = ?');
                values.push(normUsername(updates.username));
            }

            if (typeof updates.password === 'string' && updates.password.length > 0) {
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
                values.push(updates.recovery_hint ?? '');
            }

            if (!fields.length) return false;

            const existing = await db.get('SELECT id FROM default_admin');
            if (!existing) return false;

            values.push(existing.id);
            await db.run(`UPDATE default_admin SET ${fields.join(', ')} WHERE id = ?`, values);
            return true;
        },
    );

    // Згенерувати новий key для auth_user
    ipcMain.handle('auth:generate-key-for-user', async (_e, userId: number) => {
        const db = await getDb();
        const key = genKey();
        await db.run('UPDATE auth_user SET key = ? WHERE id = ?', key, userId);
        return { success: true, key };
    });

    // Видалити звичайного користувача (не default_admin)
    ipcMain.handle('auth:delete-auth-user', async (_e, userId: number) => {
        const db = await getDb();
        const row = await db.get('SELECT id FROM auth_user WHERE id = ?', userId);
        if (!row) return false;
        await db.run('DELETE FROM auth_user WHERE id = ?', userId);
        return true;
    });
}
