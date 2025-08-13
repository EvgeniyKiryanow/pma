import { ipcMain } from 'electron';

import { getDb } from '../../db/db';

export function registerRolesHandler() {
    // list roles
    ipcMain.handle('roles:list', async () => {
        const db = await getDb();
        const rows = await db.all(
            `SELECT id, name, description, allowed_tabs FROM roles ORDER BY name ASC`,
        );
        return rows.map((r: any) => ({
            ...r,
            allowed_tabs: safeParseArray(r.allowed_tabs),
        }));
    });

    // create role
    ipcMain.handle(
        'roles:create',
        async (_e, role: { name: string; description?: string; allowed_tabs: string[] }) => {
            const db = await getDb();
            try {
                await db.run(
                    `INSERT INTO roles (name, description, allowed_tabs) VALUES (?, ?, ?)`,
                    role.name.trim(),
                    role.description ?? '',
                    JSON.stringify(role.allowed_tabs ?? []),
                );
                return { success: true };
            } catch (e: any) {
                const msg = (e.message || '').includes('UNIQUE')
                    ? 'Роль з такою назвою вже існує'
                    : 'Помилка створення ролі';
                return { success: false, message: msg };
            }
        },
    );

    // update role
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

            if (typeof updates.name === 'string' && updates.name.trim()) {
                fields.push('name = ?');
                values.push(updates.name.trim());
            }
            if (typeof updates.description === 'string') {
                fields.push('description = ?');
                values.push(updates.description ?? '');
            }
            if (updates.allowed_tabs) {
                fields.push('allowed_tabs = ?');
                values.push(JSON.stringify(updates.allowed_tabs));
            }
            if (!fields.length) return { success: false, message: 'Немає змін' };

            try {
                values.push(id);
                await db.run(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`, values);
                return { success: true };
            } catch (e: any) {
                const msg = (e.message || '').includes('UNIQUE')
                    ? 'Назва ролі вже використовується'
                    : 'Помилка оновлення ролі';
                return { success: false, message: msg };
            }
        },
    );

    // delete role (only if not used)
    ipcMain.handle('roles:delete', async (_e, id: number) => {
        const db = await getDb();
        const ref = await db.get(`SELECT COUNT(*) as cnt FROM auth_user WHERE role_id = ?`, id);
        if (ref?.cnt > 0) return { success: false, message: 'Роль використовується користувачами' };
        await db.run(`DELETE FROM roles WHERE id = ?`, id);
        return { success: true };
    });

    // assign role to user
    ipcMain.handle('roles:set-for-user', async (_e, userId: number, roleId: number) => {
        const db = await getDb();
        const role = await db.get(`SELECT id, name FROM roles WHERE id = ?`, roleId);
        if (!role) return { success: false, message: 'Роль не знайдено' };

        // keep legacy "role" column in sync for compatibility
        await db.run(
            `UPDATE auth_user SET role_id = ?, role = ? WHERE id = ?`,
            role.id,
            role.name,
            userId,
        );
        return { success: true };
    });

    // get allowed tabs for user
    ipcMain.handle('roles:get-allowed-tabs-for-user', async (_e, userId: number) => {
        const db = await getDb();
        const user = await db.get(`SELECT id, role, role_id FROM auth_user WHERE id = ?`, userId);
        if (!user) return [];

        if (user.role_id) {
            const r = await db.get(`SELECT allowed_tabs FROM roles WHERE id = ?`, user.role_id);
            return safeParseArray(r?.allowed_tabs) ?? [];
        }

        // fallback for legacy user/admin string roles
        if (user.role === 'admin') {
            return [
                'manager',
                'reports',
                'backups',
                'tables',
                'importUsers',
                'shtatni',
                'instructions',
                'admin',
            ];
        }
        if (user.role === 'user') {
            return ['manager', 'instructions'];
        }
        return ['manager']; // minimal safe default
    });
}

function safeParseArray(s: any): string[] {
    try {
        const v = JSON.parse(s ?? '[]');
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}
