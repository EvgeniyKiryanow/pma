// src/ipc/handlers/authUserHandlers.ts
import crypto from 'crypto';
import { ipcMain } from 'electron';

import { getDb } from '../../db/db';

const normalize = (v: string) =>
    String(v || '')
        .trim()
        .toLowerCase();
const genKey = () => crypto.randomBytes(24).toString('hex');
export function registerRolesHandler() {
    // --- roles CRUD ---
    ipcMain.handle('roles:list', async () => {
        const db = await getDb();
        const rows = await db.all(
            `SELECT id, name, description, allowed_tabs FROM roles ORDER BY name ASC`,
        );
        return rows.map((r: any) => ({ ...r, allowed_tabs: JSON.parse(r.allowed_tabs || '[]') }));
    });

    ipcMain.handle(
        'roles:create',
        async (_e, payload: { name: string; description?: string; allowed_tabs: string[] }) => {
            const db = await getDb();
            try {
                await db.run(
                    `INSERT INTO roles (name, description, allowed_tabs) VALUES (?, ?, json(?))`,
                    normalize(payload.name),
                    payload.description ?? '',
                    JSON.stringify(payload.allowed_tabs || []),
                );
                const row = await db.get(
                    `SELECT id, name, description, allowed_tabs FROM roles WHERE name = ?`,
                    normalize(payload.name),
                );
                return {
                    success: true,
                    role: { ...row, allowed_tabs: JSON.parse(row.allowed_tabs || '[]') },
                };
            } catch {
                return { success: false, message: 'Role exists or DB error' };
            }
        },
    );

    ipcMain.handle(
        'roles:update',
        async (
            _e,
            id: number,
            updates: Partial<{ name: string; description: string; allowed_tabs: string[] }>,
        ) => {
            const db = await getDb();
            const fields: string[] = [];
            const values: any[] = [];
            if (typeof updates.name === 'string') {
                fields.push('name = ?');
                values.push(normalize(updates.name));
            }
            if (typeof updates.description === 'string') {
                fields.push('description = ?');
                values.push(updates.description);
            }
            if (Array.isArray(updates.allowed_tabs)) {
                fields.push('allowed_tabs = json(?)');
                values.push(JSON.stringify(updates.allowed_tabs));
            }
            if (!fields.length) return { success: false, message: 'No updates' };
            values.push(id);
            try {
                await db.run(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`, values);
                const row = await db.get(
                    `SELECT id, name, description, allowed_tabs FROM roles WHERE id = ?`,
                    id,
                );
                return {
                    success: true,
                    role: { ...row, allowed_tabs: JSON.parse(row.allowed_tabs || '[]') },
                };
            } catch {
                return { success: false, message: 'DB error' };
            }
        },
    );

    ipcMain.handle('roles:delete', async (_e, id: number) => {
        const db = await getDb();
        const inUse = await db.get(`SELECT COUNT(*) AS c FROM auth_user WHERE role_id = ?`, id);
        if (inUse?.c > 0) return { success: false, message: 'Role is assigned to users' };
        await db.run(`DELETE FROM roles WHERE id = ?`, id);
        return { success: true };
    });
}
