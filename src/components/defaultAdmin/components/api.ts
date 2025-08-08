import type { FullUser, NewUserState } from './types';

export async function fetchAll(): Promise<FullUser[]> {
    const authUsers = await window.electronAPI.getAuthUsers();
    const defaultAdmin = await window.electronAPI.getDefaultAdmin();

    const formattedAuth: FullUser[] = (authUsers || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        recovery_hint: u.recovery_hint || null,
        key: u.key || '',
        role: (u.role === 'admin' ? 'admin' : 'user') as FullUser['role'],
        source: 'auth_user',
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
    if (user.source === 'auth_user') update.role = user.role;
    if (user.password && user.password.length < 50) update.password = user.password;

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
