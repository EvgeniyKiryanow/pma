import { randomUUID } from 'crypto';

import type { Db } from '../types';
import { columnNames, SQL_NOW_ISO, tableExists } from './helpers';
import type { Migration } from './types';

/**
 * Replaces the legacy auth model (auth_user + default_admin + superuser + tab-based roles)
 * with accounts / roles / role_permissions.
 *
 * The tab → permission mapping below is a frozen snapshot of v1.6 semantics:
 * access to a tab meant full access to everything on it.
 */
const LEGACY_TAB_PERMISSIONS: Record<string, string[]> = {
    manager: [
        'personnel.view',
        'personnel.create',
        'personnel.edit',
        'personnel.delete',
        'history.edit',
        'directives.view',
        'directives.edit',
    ],
    reports: ['reports.view', 'reports.templates'],
    tables: ['tables.view', 'tables.edit'],
    importUsers: ['personnel.import', 'staffing.edit'],
    shtatni: ['staffing.view', 'staffing.edit'],
    backups: ['backup.export', 'backup.import', 'sync.export', 'sync.import'],
    admin: ['accounts.manage', 'roles.manage'],
    instructions: [],
    reminders: [],
};

/** v1.6 default for accounts without an explicit role. */
const LEGACY_DEFAULT_USER_TABS = ['manager', 'reports', 'tables', 'instructions'];

const SYSTEM_ADMIN_ROLE_NAME = 'Адміністратор';
const LEGACY_USER_ROLE_NAME = 'Користувач';

type LegacyRole = { id: number; name: string; description: string | null; allowed_tabs: string };

function tabsToPermissions(tabsJson: string | string[] | null): string[] {
    let tabs: unknown = tabsJson;
    if (typeof tabsJson === 'string') {
        try {
            tabs = JSON.parse(tabsJson);
        } catch {
            tabs = [];
        }
    }
    if (!Array.isArray(tabs)) return [];
    const result = new Set<string>();
    for (const tab of tabs)
        for (const p of LEGACY_TAB_PERMISSIONS[String(tab)] ?? []) result.add(p);
    return [...result];
}

async function insertRole(
    db: Db,
    role: { name: string; description: string; isSystem: boolean; grantsAll: boolean },
    permissions: string[],
): Promise<number> {
    const res = await db.run(
        `INSERT INTO roles (uuid, name, description, is_system, grants_all) VALUES (?, ?, ?, ?, ?)`,
        randomUUID(),
        role.name,
        role.description,
        role.isSystem ? 1 : 0,
        role.grantsAll ? 1 : 0,
    );
    const roleId = Number(res.lastID);
    for (const permission of permissions) {
        await db.run(
            `INSERT OR IGNORE INTO role_permissions (role_id, permission) VALUES (?, ?)`,
            roleId,
            permission,
        );
    }
    return roleId;
}

async function uniqueRoleName(db: Db, wanted: string): Promise<string> {
    let name = wanted.trim() || 'Роль';
    for (let i = 2; await db.get(`SELECT 1 FROM roles WHERE name = ?`, name); i++) {
        name = `${wanted.trim()} (${i})`;
    }
    return name;
}

async function uniqueUsername(db: Db, wanted: string): Promise<string> {
    let name = wanted;
    for (let i = 1; await db.get(`SELECT 1 FROM accounts WHERE username = ?`, name); i++) {
        name = `${wanted}_${i}`;
    }
    return name;
}

export const accountsAndPermissions: Migration = {
    version: 2,
    name: 'accounts-and-permissions',
    verifyForeignKeys: ['accounts', 'role_permissions'],
    async up(db) {
        const hasLegacyRoles = await tableExists(db, 'roles');
        if (hasLegacyRoles) await db.exec(`ALTER TABLE roles RENAME TO legacy_roles`);

        await db.exec(`
            CREATE TABLE roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL COLLATE NOCASE UNIQUE,
                description TEXT NOT NULL DEFAULT '',
                is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
                grants_all INTEGER NOT NULL DEFAULT 0 CHECK (grants_all IN (0, 1)),
                created_at TEXT NOT NULL DEFAULT (${SQL_NOW_ISO}),
                updated_at TEXT NOT NULL DEFAULT (${SQL_NOW_ISO})
            );
            CREATE UNIQUE INDEX ux_roles_single_system ON roles(is_system) WHERE is_system = 1;

            CREATE TABLE role_permissions (
                role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                permission TEXT NOT NULL,
                PRIMARY KEY (role_id, permission)
            ) WITHOUT ROWID;

            CREATE TABLE accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL COLLATE NOCASE UNIQUE,
                display_name TEXT NOT NULL DEFAULT '',
                password_hash TEXT NOT NULL,
                role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
                is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
                must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
                recovery_code_hash TEXT,
                failed_login_count INTEGER NOT NULL DEFAULT 0,
                locked_until TEXT,
                last_login_at TEXT,
                created_at TEXT NOT NULL DEFAULT (${SQL_NOW_ISO}),
                updated_at TEXT NOT NULL DEFAULT (${SQL_NOW_ISO})
            );
            CREATE INDEX idx_accounts_role ON accounts(role_id);
        `);

        const adminRoleId = await insertRole(
            db,
            {
                name: SYSTEM_ADMIN_ROLE_NAME,
                description: 'Повний доступ до всіх функцій, включно з майбутніми',
                isSystem: true,
                grantsAll: true,
            },
            [],
        );

        // ---- legacy roles -> roles ----
        const legacyRoleMap = new Map<number, number>();
        if (hasLegacyRoles) {
            const legacyRoles: LegacyRole[] = await db.all(
                `SELECT id, name, description, allowed_tabs FROM legacy_roles ORDER BY id`,
            );
            for (const legacy of legacyRoles) {
                const lowered = legacy.name.trim().toLowerCase();
                if (lowered === 'admin') {
                    legacyRoleMap.set(legacy.id, adminRoleId);
                    continue;
                }
                const name = await uniqueRoleName(
                    db,
                    lowered === 'user' ? LEGACY_USER_ROLE_NAME : legacy.name,
                );
                const roleId = await insertRole(
                    db,
                    {
                        name,
                        description: legacy.description ?? '',
                        isSystem: false,
                        grantsAll: false,
                    },
                    tabsToPermissions(legacy.allowed_tabs),
                );
                legacyRoleMap.set(legacy.id, roleId);
            }
        }

        let defaultUserRoleId: number | null = null;
        const ensureDefaultUserRole = async (): Promise<number> => {
            if (defaultUserRoleId) return defaultUserRoleId;
            const existing = await db.get<{ id: number }>(
                `SELECT id FROM roles WHERE name = ?`,
                LEGACY_USER_ROLE_NAME,
            );
            defaultUserRoleId =
                existing?.id ??
                (await insertRole(
                    db,
                    {
                        name: LEGACY_USER_ROLE_NAME,
                        description: 'Перенесено з попередньої версії',
                        isSystem: false,
                        grantsAll: false,
                    },
                    tabsToPermissions(LEGACY_DEFAULT_USER_TABS),
                ));
            return defaultUserRoleId;
        };

        // ---- default_admin -> admin account (it had priority at login in v1.6) ----
        if (await tableExists(db, 'default_admin')) {
            const admins: { username: string; password: string }[] = await db.all(
                `SELECT username, password FROM default_admin ORDER BY id LIMIT 1`,
            );
            for (const admin of admins) {
                await db.run(
                    `INSERT INTO accounts (uuid, username, password_hash, role_id) VALUES (?, ?, ?, ?)`,
                    randomUUID(),
                    admin.username.trim().toLowerCase(),
                    admin.password,
                    adminRoleId,
                );
            }
        }

        // ---- auth_user -> accounts ----
        if (await tableExists(db, 'auth_user')) {
            const cols = await columnNames(db, 'auth_user');
            const select = [
                'id',
                'username',
                'password',
                cols.has('role') ? 'role' : 'NULL AS role',
                cols.has('role_id') ? 'role_id' : 'NULL AS role_id',
            ].join(', ');
            const users: {
                username: string;
                password: string;
                role: string | null;
                role_id: number | null;
            }[] = await db.all(`SELECT ${select} FROM auth_user ORDER BY id`);

            for (const user of users) {
                let roleId: number | undefined;
                if (user.role_id != null) roleId = legacyRoleMap.get(user.role_id);
                if (!roleId && String(user.role ?? '').toLowerCase() === 'admin') {
                    roleId = adminRoleId;
                }
                if (!roleId) roleId = await ensureDefaultUserRole();

                const username = await uniqueUsername(db, user.username.trim().toLowerCase());
                await db.run(
                    `INSERT INTO accounts (uuid, username, password_hash, role_id) VALUES (?, ?, ?, ?)`,
                    randomUUID(),
                    username,
                    user.password,
                    roleId,
                );
            }
        }

        // An install must never end up without an administrator: nobody could manage it.
        const adminCount = await db.get<{ n: number }>(
            `SELECT COUNT(*) AS n FROM accounts WHERE role_id = ?`,
            adminRoleId,
        );
        if (!adminCount?.n) {
            await db.run(
                `UPDATE accounts SET role_id = ? WHERE id = (SELECT MIN(id) FROM accounts)`,
                adminRoleId,
            );
        }

        await db.exec(`
            DROP TABLE IF EXISTS auth_user;
            DROP TABLE IF EXISTS default_admin;
            DROP TABLE IF EXISTS superuser;
            DROP TABLE IF EXISTS legacy_roles;
        `);
    },
};
