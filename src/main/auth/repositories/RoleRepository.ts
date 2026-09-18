import type { DbProvider } from '../../db/types';

export type RoleRow = {
    id: number;
    uuid: string;
    name: string;
    description: string;
    is_system: number;
    grants_all: number;
    account_count: number;
    created_at: string;
    updated_at: string;
};

const SELECT_ROLE = `
    SELECT r.*, (SELECT COUNT(*) FROM accounts a WHERE a.role_id = r.id) AS account_count
    FROM roles r
`;

export class RoleRepository {
    constructor(private readonly db: DbProvider) {}

    async list(): Promise<RoleRow[]> {
        return (await this.db()).all<RoleRow[]>(
            `${SELECT_ROLE} ORDER BY r.is_system DESC, r.name COLLATE NOCASE`,
        );
    }

    async findById(id: number): Promise<RoleRow | undefined> {
        return (await this.db()).get<RoleRow>(`${SELECT_ROLE} WHERE r.id = ?`, id);
    }

    async findByName(name: string): Promise<RoleRow | undefined> {
        return (await this.db()).get<RoleRow>(`${SELECT_ROLE} WHERE r.name = ?`, name);
    }

    async findSystemRole(): Promise<RoleRow | undefined> {
        return (await this.db()).get<RoleRow>(`${SELECT_ROLE} WHERE r.is_system = 1`);
    }

    async permissionsOf(roleId: number): Promise<string[]> {
        const rows = await (
            await this.db()
        ).all<{ permission: string }[]>(
            `SELECT permission FROM role_permissions WHERE role_id = ? ORDER BY permission`,
            roleId,
        );
        return rows.map((r) => r.permission);
    }

    async permissionsByRole(): Promise<Map<number, string[]>> {
        const rows = await (
            await this.db()
        ).all<{ role_id: number; permission: string }[]>(
            `SELECT role_id, permission FROM role_permissions ORDER BY permission`,
        );
        const map = new Map<number, string[]>();
        for (const row of rows) {
            const list = map.get(row.role_id) ?? [];
            list.push(row.permission);
            map.set(row.role_id, list);
        }
        return map;
    }

    async create(role: { uuid: string; name: string; description: string }): Promise<number> {
        const res = await (
            await this.db()
        ).run(
            `INSERT INTO roles (uuid, name, description) VALUES (?, ?, ?)`,
            role.uuid,
            role.name,
            role.description,
        );
        return Number(res.lastID);
    }

    async update(id: number, patch: { name: string; description: string }): Promise<void> {
        await (
            await this.db()
        ).run(
            `UPDATE roles SET name = ?, description = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?`,
            patch.name,
            patch.description,
            id,
        );
    }

    async replacePermissions(roleId: number, permissions: readonly string[]): Promise<void> {
        const db = await this.db();
        await db.run(`DELETE FROM role_permissions WHERE role_id = ?`, roleId);
        for (const permission of permissions) {
            await db.run(
                `INSERT INTO role_permissions (role_id, permission) VALUES (?, ?)`,
                roleId,
                permission,
            );
        }
    }

    async delete(id: number): Promise<void> {
        await (await this.db()).run(`DELETE FROM roles WHERE id = ?`, id);
    }
}
