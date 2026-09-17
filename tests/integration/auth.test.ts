import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { PasswordHasher, PasswordPolicy } from '../../src/main/auth/PasswordHasher';
import { RecoveryCodes } from '../../src/main/auth/RecoveryCodes';
import { AccountRepository } from '../../src/main/auth/repositories/AccountRepository';
import { RoleRepository } from '../../src/main/auth/repositories/RoleRepository';
import { AccountService } from '../../src/main/auth/services/AccountService';
import { AuthService } from '../../src/main/auth/services/AuthService';
import { RoleService } from '../../src/main/auth/services/RoleService';
import { SessionFactory } from '../../src/main/auth/services/SessionFactory';
import { SessionManager } from '../../src/main/auth/SessionManager';
import { DatabaseManager } from '../../src/main/db/connection';
import { migrationRunner } from '../../src/main/db/migrations';
import { ALL_PERMISSION_KEYS } from '../../src/shared/auth/permissions';

const ADMIN = { username: 'komandyr', password: 'Rota-Parol-2026' };
const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

/** Stand-in for a window: SessionManager only needs an id and the `once` hook. */
const windowStub = (id: number) =>
    ({ id, once: (): void => undefined, send: (): void => undefined, isDestroyed: () => false }) as any;

let workDir: string;
let database: DatabaseManager;
let sessions: SessionManager;
let auth: AuthService;
let accountService: AccountService;
let roleService: RoleService;
let sender: any;

async function expectCode(promise: Promise<unknown>, code: string) {
    await expect(promise).rejects.toMatchObject({ code });
}

beforeEach(async () => {
    workDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-auth-'));
    const file = path.join(workDir, 'users.db');
    database = new DatabaseManager(() => file);
    await migrationRunner.run(await database.get());

    const provider = () => database.get();
    const accounts = new AccountRepository(provider);
    const roles = new RoleRepository(provider);
    const hasher = new PasswordHasher();
    const policy = new PasswordPolicy();
    sessions = new SessionManager();
    auth = new AuthService(
        database,
        accounts,
        roles,
        sessions,
        new SessionFactory(roles),
        hasher,
        policy,
        new RecoveryCodes(),
        silentLogger,
        { maxAttempts: 3, lockMinutes: 5 },
    );
    accountService = new AccountService(database, accounts, roles, hasher, policy, auth, silentLogger);
    roleService = new RoleService(database, roles, auth, silentLogger);
    sender = windowStub(1);
});

afterAll(async () => {
    await database?.close().catch((): void => undefined);
});

async function setupAdmin() {
    return auth.setup(sender, { username: ADMIN.username, password: ADMIN.password });
}

describe('first run', () => {
    it('reports an empty installation', async () => {
        expect(await auth.getState(sender)).toEqual({ hasAccounts: false, session: null });
    });

    it('creates the administrator, signs them in and shows a recovery code once', async () => {
        const { session, recoveryCode } = await setupAdmin();

        expect(session.username).toBe(ADMIN.username);
        expect(session.grantsAll).toBe(true);
        expect(session.permissions.sort()).toEqual([...ALL_PERMISSION_KEYS].sort());
        expect(session.mustChangePassword).toBe(false);
        expect(recoveryCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

        const state = await auth.getState(sender);
        expect(state.hasAccounts).toBe(true);
        expect(state.session?.accountId).toBe(session.accountId);
    });

    it('refuses a second setup', async () => {
        await setupAdmin();
        await expectCode(auth.setup(windowStub(2), { username: 'other', password: 'Parol-12345' }), 'SETUP_ALREADY_DONE');
    });

    it('validates the login and the password', async () => {
        await expectCode(auth.setup(sender, { username: 'ab', password: 'Parol-12345' }), 'VALIDATION');
        await expectCode(auth.setup(sender, { username: 'komandyr', password: 'short' }), 'VALIDATION');
        await expectCode(auth.setup(sender, { username: 'bad login!', password: 'Parol-12345' }), 'VALIDATION');
    });
});

describe('login', () => {
    beforeEach(async () => {
        await setupAdmin();
        auth.logout(sender);
    });

    it('accepts the right password, whatever the letter case of the login', async () => {
        const session = await auth.login(sender, 'KOMANDYR', ADMIN.password);
        expect(session.username).toBe(ADMIN.username);
    });

    it('rejects a wrong password and an unknown user the same way', async () => {
        await expectCode(auth.login(sender, ADMIN.username, 'wrong-password'), 'INVALID_CREDENTIALS');
        await expectCode(auth.login(sender, 'nobody', 'wrong-password'), 'INVALID_CREDENTIALS');
    });

    it('locks an account after repeated failures, and another administrator can unlock it', async () => {
        // A second administrator exists, as it would in a unit; otherwise nobody could unlock.
        const owner = await auth.login(windowStub(8), ADMIN.username, ADMIN.password);
        const deputy = await accountService.create(owner, {
            username: 'zastupnyk',
            password: 'Parol-12345',
            roleId: owner.roleId,
        });

        for (let attempt = 0; attempt < 3; attempt++) {
            await expectCode(auth.login(sender, 'zastupnyk', 'wrong-password'), 'INVALID_CREDENTIALS');
        }
        // Even the correct password is refused while the lock lasts.
        await expectCode(auth.login(sender, 'zastupnyk', 'Parol-12345'), 'ACCOUNT_LOCKED');
        expect((await accountService.list()).find((a) => a.id === deputy.id)?.lockedUntil).toBeTruthy();

        await accountService.unlock(owner, deputy.id);
        const session = await auth.login(sender, 'zastupnyk', 'Parol-12345');
        expect(session.username).toBe('zastupnyk');
    });

    it('lets the lock expire on its own', async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
            await expectCode(auth.login(sender, ADMIN.username, 'wrong-password'), 'INVALID_CREDENTIALS');
        }
        await expectCode(auth.login(sender, ADMIN.username, ADMIN.password), 'ACCOUNT_LOCKED');

        // Simulate waiting out the lock: the stored moment is in the past now.
        const db = await database.get();
        await db.run(`UPDATE accounts SET locked_until = ? WHERE username = ?`, new Date(Date.now() - 1000).toISOString(), ADMIN.username);

        await expect(auth.login(sender, ADMIN.username, ADMIN.password)).resolves.toBeTruthy();
    });

    it('refuses a deactivated account', async () => {
        const owner = await auth.login(windowStub(7), ADMIN.username, ADMIN.password);
        const extra = await accountService.create(owner, {
            username: 'operator',
            password: 'Parol-12345',
            roleId: (await roleService.list()).find((r) => !r.isSystem)?.id ?? owner.roleId,
        });
        await accountService.update(owner, extra.id, { isActive: false });
        await expectCode(auth.login(windowStub(3), 'operator', 'Parol-12345'), 'ACCOUNT_INACTIVE');
    });
});

describe('password change and recovery', () => {
    it('requires the current password and a different new one', async () => {
        await setupAdmin();
        await expectCode(auth.changePassword(sender, 'wrong', 'Novyi-Parol-1'), 'INVALID_CREDENTIALS');
        await expectCode(auth.changePassword(sender, ADMIN.password, ADMIN.password), 'VALIDATION');
        await expectCode(auth.changePassword(sender, ADMIN.password, 'short'), 'VALIDATION');

        const session = await auth.changePassword(sender, ADMIN.password, 'Novyi-Parol-1');
        expect(session.mustChangePassword).toBe(false);

        auth.logout(sender);
        await expect(auth.login(sender, ADMIN.username, 'Novyi-Parol-1')).resolves.toBeTruthy();
    });

    it('accepts the recovery code once and then invalidates it', async () => {
        const { recoveryCode } = await setupAdmin();
        auth.logout(sender);

        await expectCode(auth.recover(ADMIN.username, 'WRON-GCOD-EWRO-NG12', 'Novyi-Parol-1'), 'INVALID_CREDENTIALS');
        await auth.recover(ADMIN.username, recoveryCode, 'Novyi-Parol-1');
        await expect(auth.login(sender, ADMIN.username, 'Novyi-Parol-1')).resolves.toBeTruthy();

        // The same code must not work a second time.
        await expectCode(auth.recover(ADMIN.username, recoveryCode, 'Inshyi-Parol-2'), 'INVALID_CREDENTIALS');
    });

    it('ignores case, spaces and dashes in the recovery code', async () => {
        const { recoveryCode } = await setupAdmin();
        const messy = ` ${recoveryCode.toLowerCase().replace(/-/g, ' ')} `;
        await auth.recover(ADMIN.username, messy, 'Novyi-Parol-1');
        auth.logout(sender);
        await expect(auth.login(sender, ADMIN.username, 'Novyi-Parol-1')).resolves.toBeTruthy();
    });

    it('issues a new code only after confirming the password', async () => {
        await setupAdmin();
        await expectCode(auth.regenerateRecoveryCode(sender, 'wrong'), 'INVALID_CREDENTIALS');
        const code = await auth.regenerateRecoveryCode(sender, ADMIN.password);
        expect(code).toMatch(/^[A-Z0-9-]{19}$/);
    });
});

describe('accounts administration', () => {
    let owner: any;
    let regularRoleId: number;

    beforeEach(async () => {
        owner = (await setupAdmin()).session;
        const role = await roleService.create(owner, {
            name: 'Оператор',
            description: 'перегляд',
            permissions: ['personnel.view'],
        });
        regularRoleId = role.id;
    });

    it('creates a user who must replace the temporary password', async () => {
        const created = await accountService.create(owner, {
            username: 'operator',
            displayName: 'Оператор зміни',
            password: 'Tymchasovyi-1',
            roleId: regularRoleId,
        });
        expect(created.mustChangePassword).toBe(true);

        const session = await auth.login(windowStub(2), 'operator', 'Tymchasovyi-1');
        expect(session.mustChangePassword).toBe(true);
        expect(session.permissions).toEqual(['personnel.view']);
    });

    it('rejects a duplicate login and a weak password', async () => {
        await accountService.create(owner, { username: 'operator', password: 'Parol-12345', roleId: regularRoleId });
        await expectCode(
            accountService.create(owner, { username: 'OPERATOR', password: 'Parol-12345', roleId: regularRoleId }),
            'CONFLICT',
        );
        await expectCode(
            accountService.create(owner, { username: 'another', password: '123', roleId: regularRoleId }),
            'VALIDATION',
        );
        await expectCode(
            accountService.create(owner, { username: 'another', password: 'Parol-12345', roleId: 9999 }),
            'NOT_FOUND',
        );
    });

    it('keeps at least one active administrator', async () => {
        await expectCode(accountService.update(owner, owner.accountId, { roleId: regularRoleId }), 'LAST_ADMIN');
        await expectCode(accountService.update(owner, owner.accountId, { isActive: false }), 'VALIDATION');
        await expectCode(accountService.remove(owner, owner.accountId), 'VALIDATION');

        // With a second administrator the first one may be demoted.
        const second = await accountService.create(owner, {
            username: 'zastupnyk',
            password: 'Parol-12345',
            roleId: owner.roleId,
        });
        await expect(
            accountService.update(owner, owner.accountId, { roleId: regularRoleId }),
        ).resolves.toBeTruthy();
        expect((await accountService.list()).find((a) => a.id === second.id)?.roleGrantsAll).toBe(true);
    });

    it('resets a password and forces a change at next login', async () => {
        const account = await accountService.create(owner, {
            username: 'operator',
            password: 'Parol-12345',
            roleId: regularRoleId,
        });
        await auth.login(windowStub(2), 'operator', 'Parol-12345');

        await accountService.resetPassword(owner, account.id, 'Novyi-Tymchasovyi-1');
        await expectCode(auth.login(windowStub(3), 'operator', 'Parol-12345'), 'INVALID_CREDENTIALS');
        const session = await auth.login(windowStub(3), 'operator', 'Novyi-Tymchasovyi-1');
        expect(session.mustChangePassword).toBe(true);
    });

    it('deletes a regular account', async () => {
        const account = await accountService.create(owner, {
            username: 'operator',
            password: 'Parol-12345',
            roleId: regularRoleId,
        });
        await accountService.remove(owner, account.id);
        expect((await accountService.list()).map((a) => a.username)).toEqual([ADMIN.username]);
    });
});

describe('roles administration', () => {
    let owner: any;

    beforeEach(async () => {
        owner = (await setupAdmin()).session;
    });

    it('stores permissions and expands dependencies in the session', async () => {
        const role = await roleService.create(owner, {
            name: 'Діловод',
            permissions: ['reports.templates', 'personnel.view'],
        });
        await accountService.create(owner, {
            username: 'dilovod',
            password: 'Parol-12345',
            roleId: role.id,
        });

        const session = await auth.login(windowStub(4), 'dilovod', 'Parol-12345');
        // reports.templates needs reports.view, which needs personnel.view
        expect(session.permissions.sort()).toEqual([
            'personnel.view',
            'reports.templates',
            'reports.view',
        ]);
    });

    it('rejects unknown permissions and duplicate names', async () => {
        await roleService.create(owner, { name: 'Оператор', permissions: ['personnel.view'] });
        await expectCode(
            roleService.create(owner, { name: 'Інша', permissions: ['personnel.view', 'made.up'] as any }),
            'VALIDATION',
        );
        await expectCode(
            roleService.create(owner, { name: 'оператор', permissions: [] }),
            'CONFLICT',
        );
        await expectCode(roleService.create(owner, { name: 'X', permissions: [] }), 'VALIDATION');
    });

    it('protects the system role', async () => {
        const system = (await roleService.list()).find((role) => role.isSystem)!;
        await expectCode(roleService.remove(owner, system.id), 'VALIDATION');

        // Its permission list is not editable: it always grants everything.
        const updated = await roleService.update(owner, system.id, {
            name: system.name,
            permissions: ['personnel.view'],
        });
        expect(updated.permissions.sort()).toEqual([...ALL_PERMISSION_KEYS].sort());
    });

    it('refuses to delete a role that is assigned to somebody', async () => {
        const role = await roleService.create(owner, { name: 'Оператор', permissions: ['personnel.view'] });
        await accountService.create(owner, {
            username: 'operator',
            password: 'Parol-12345',
            roleId: role.id,
        });
        await expectCode(roleService.remove(owner, role.id), 'CONFLICT');
    });

    it('updates live sessions when the role changes', async () => {
        const role = await roleService.create(owner, { name: 'Оператор', permissions: ['personnel.view'] });
        await accountService.create(owner, {
            username: 'operator',
            password: 'Parol-12345',
            roleId: role.id,
        });
        const userWindow = windowStub(5);
        await auth.login(userWindow, 'operator', 'Parol-12345');
        expect(sessions.get(userWindow)?.permissions).toEqual(['personnel.view']);

        await roleService.update(owner, role.id, {
            name: 'Оператор',
            permissions: ['personnel.view', 'personnel.edit'],
        });

        expect(sessions.get(userWindow)?.permissions.sort()).toEqual(['personnel.edit', 'personnel.view']);
    });
});
