import type { DbProvider } from '../../db/types';

export type AccountRow = {
    id: number;
    uuid: string;
    username: string;
    display_name: string;
    password_hash: string;
    role_id: number;
    role_name: string;
    role_grants_all: number;
    is_active: number;
    must_change_password: number;
    recovery_code_hash: string | null;
    failed_login_count: number;
    locked_until: string | null;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
};

export type NewAccount = {
    uuid: string;
    username: string;
    displayName: string;
    passwordHash: string;
    roleId: number;
    mustChangePassword: boolean;
};

/** Columns a service may change. Anything else is rejected, so no SQL is built from input keys. */
export type AccountPatch = Partial<{
    display_name: string;
    password_hash: string;
    role_id: number;
    is_active: number;
    must_change_password: number;
    recovery_code_hash: string | null;
    failed_login_count: number;
    locked_until: string | null;
    last_login_at: string | null;
}>;

const PATCHABLE = new Set<keyof AccountPatch>([
    'display_name',
    'password_hash',
    'role_id',
    'is_active',
    'must_change_password',
    'recovery_code_hash',
    'failed_login_count',
    'locked_until',
    'last_login_at',
]);

const SELECT_ACCOUNT = `
    SELECT a.*, r.name AS role_name, r.grants_all AS role_grants_all
    FROM accounts a
    JOIN roles r ON r.id = a.role_id
`;

export class AccountRepository {
    constructor(private readonly db: DbProvider) {}

    async count(): Promise<number> {
        const row = await (
            await this.db()
        ).get<{ n: number }>(`SELECT COUNT(*) AS n FROM accounts`);
        return row?.n ?? 0;
    }

    async findById(id: number): Promise<AccountRow | undefined> {
        return (await this.db()).get<AccountRow>(`${SELECT_ACCOUNT} WHERE a.id = ?`, id);
    }

    async findByUsername(username: string): Promise<AccountRow | undefined> {
        return (await this.db()).get<AccountRow>(
            `${SELECT_ACCOUNT} WHERE a.username = ?`,
            username,
        );
    }

    async list(): Promise<AccountRow[]> {
        return (await this.db()).all<AccountRow[]>(`${SELECT_ACCOUNT} ORDER BY a.username`);
    }

    async create(account: NewAccount): Promise<number> {
        const res = await (
            await this.db()
        ).run(
            `INSERT INTO accounts (uuid, username, display_name, password_hash, role_id, must_change_password)
             VALUES (?, ?, ?, ?, ?, ?)`,
            account.uuid,
            account.username,
            account.displayName,
            account.passwordHash,
            account.roleId,
            account.mustChangePassword ? 1 : 0,
        );
        return Number(res.lastID);
    }

    async update(id: number, patch: AccountPatch): Promise<void> {
        const entries = Object.entries(patch).filter(([key]) =>
            PATCHABLE.has(key as keyof AccountPatch),
        );
        if (!entries.length) return;
        const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
        await (
            await this.db()
        ).run(
            `UPDATE accounts SET ${assignments}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
            ...entries.map(([, value]) => value),
            id,
        );
    }

    async delete(id: number): Promise<void> {
        await (await this.db()).run(`DELETE FROM accounts WHERE id = ?`, id);
    }

    /** Active accounts whose role grants everything, optionally ignoring one account. */
    async countActiveAdmins(excludeAccountId?: number): Promise<number> {
        const row = await (
            await this.db()
        ).get<{ n: number }>(
            `SELECT COUNT(*) AS n FROM accounts a JOIN roles r ON r.id = a.role_id
             WHERE a.is_active = 1 AND r.grants_all = 1 AND a.id != ?`,
            excludeAccountId ?? -1,
        );
        return row?.n ?? 0;
    }
}
