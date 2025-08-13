// src/pages/admin/model/api.ts
import type { FullUser, NewUserState } from './types';

export type TabKey =
    | 'manager'
    | 'backups'
    | 'reports'
    | 'tables'
    | 'importUsers'
    | 'shtatni'
    | 'instructions'
    | 'admin';

export type RoleDTO = {
    id: number;
    name: string;
    description: string;
    allowed_tabs: TabKey[];
};

// ------- Users (existing) -------
export async function fetchAll(): Promise<
    (FullUser & {
        role_id?: number | null;
        role_name?: string | null;
    })[]
> {
    const authUsers = await window.electronAPI.getAuthUsers();
    const defaultAdmin = await window.electronAPI.getDefaultAdmin();

    const formattedAuth: (FullUser & { role_id?: number | null; role_name?: string | null })[] = (
        authUsers || []
    ).map((u: any) => ({
        id: u.id,
        username: u.username,
        recovery_hint: u.recovery_hint || null,
        key: u.key || '',
        role: (u.role === 'admin' ? 'admin' : 'user') as FullUser['role'],
        source: 'auth_user',
        // NEW passthrough fields from IPC (if present)
        role_id: u.role_id ?? null,
        role_name: u.role_name ?? null,
    }));

    const adminUser: FullUser[] = defaultAdmin
        ? [
              {
                  id: defaultAdmin.id,
                  username: defaultAdmin.username,
                  recovery_hint: defaultAdmin.recovery_hint || null,
                  key: defaultAdmin.key || '',
                  role: 'default_admin',
                  source: 'default_admin',
              },
          ]
        : [];

    return [...adminUser, ...formattedAuth];
}

export async function createUser(newUser: NewUserState) {
    return window.electronAPI.register(
        newUser.username.trim().toLowerCase(),
        newUser.password,
        newUser.recovery_hint || '',
    );
}

export async function saveUser(user: FullUser) {
    const update: any = {
        username: String(user.username || '')
            .trim()
            .toLowerCase(),
        recovery_hint: user.recovery_hint ?? '',
    };
    // keep legacy text role update for backward compatibility
    if (user.source === 'auth_user') update.role = user.role;
    if ((user as any).password && (user as any).password.length < 50) {
        update.password = (user as any).password;
    }

    return user.source === 'default_admin'
        ? window.electronAPI.updateDefaultAdmin(update)
        : window.electronAPI.updateAuthUser(user.id, update);
}

export async function generateKey(userId: number) {
    return window.electronAPI.generateKeyForUser(userId);
}

export async function deleteUser(userId: number) {
    return window.electronAPI.deleteAuthUser(userId);
}

// ------- Roles (NEW) -------
export async function fetchRoles() {
    return window.electronAPI.roles.list();
}

export async function createRole(role: {
    name: string;
    description?: string;
    allowed_tabs: string[];
}) {
    return window.electronAPI.roles.create(role);
}

export async function updateRole(
    id: number,
    updates: Partial<{ name: string; description: string; allowed_tabs: string[] }>,
) {
    return window.electronAPI.roles.update(id, updates);
}

export async function deleteRole(id: number) {
    return window.electronAPI.roles.delete(id);
}

export async function setUserRole(userId: number, roleId: number) {
    return window.electronAPI.roles.setForUser(userId, roleId);
}

export async function getAllowedTabsForUser(userId: number) {
    return window.electronAPI.roles.getAllowedTabsForUser(userId);
}
