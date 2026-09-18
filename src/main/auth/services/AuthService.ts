import { randomUUID } from 'crypto';
import type { WebContents } from 'electron';

import type { AuthState, SessionInfo, SetupInput } from '../../../shared/auth/types';
import { AppError } from '../../../shared/ipc/result';
import type { Logger } from '../../core/logger';
import type { Transactor } from '../../db/types';
import { type DataKeyring, noKeyring } from '../DataKeyring';
import type { PasswordHasher, PasswordPolicy } from '../PasswordHasher';
import type { RecoveryCodes } from '../RecoveryCodes';
import type { AccountRepository, AccountRow } from '../repositories/AccountRepository';
import type { RoleRepository } from '../repositories/RoleRepository';
import { type SessionManager, toSessionInfo } from '../SessionManager';
import type { KeptAccount } from './AccountService';
import type { SessionFactory } from './SessionFactory';
import { normalizeUsername, validateDisplayName, validateUsername } from './validation';

export type LockoutPolicy = { maxAttempts: number; lockMinutes: number };

export class AuthService {
    constructor(
        private readonly database: Transactor,
        private readonly accounts: AccountRepository,
        private readonly roles: RoleRepository,
        private readonly sessions: SessionManager,
        private readonly sessionFactory: SessionFactory,
        private readonly hasher: PasswordHasher,
        private readonly policy: PasswordPolicy,
        private readonly recoveryCodes: RecoveryCodes,
        private readonly logger: Logger,
        private readonly lockout: LockoutPolicy = { maxAttempts: 5, lockMinutes: 5 },
        /** The data key follows the passwords (see security/DataVault). */
        private readonly keyring: DataKeyring = noKeyring,
    ) {}

    async hasAccounts(): Promise<boolean> {
        // Locked data exists, so its accounts do (they are inside the encrypted database).
        if (this.keyring.isLocked()) return true;
        return (await this.accounts.count()) > 0;
    }

    async getState(sender: WebContents): Promise<AuthState> {
        const session = this.sessions.get(sender);
        return {
            hasAccounts: await this.hasAccounts(),
            session: session ? toSessionInfo(session) : null,
            lock: session ? null : this.sessions.lockOf(sender),
            dataLocked: this.keyring.isLocked(),
        };
    }

    /** First run only: creates the main administrator and signs them in. */
    async setup(
        sender: WebContents,
        input: SetupInput,
    ): Promise<{ session: SessionInfo; recoveryCode: string }> {
        const { username, displayName } = this.checkSetup(input);
        const passwordHash = await this.hasher.hash(input.password);
        const recoveryCode = this.recoveryCodes.generate();
        const recoveryHash = await this.hasher.hash(this.recoveryCodes.normalize(recoveryCode));

        const accountId = await this.database.transaction(async () => {
            if ((await this.accounts.count()) > 0) throw new AppError('SETUP_ALREADY_DONE');
            const adminRole = await this.roles.findSystemRole();
            if (!adminRole) throw new AppError('INTERNAL', 'System administrator role is missing');
            const id = await this.accounts.create({
                uuid: randomUUID(),
                username,
                displayName,
                passwordHash,
                roleId: adminRole.id,
                mustChangePassword: false,
            });
            await this.accounts.update(id, { recovery_code_hash: recoveryHash });
            return id;
        });

        this.logger.info(`Initial administrator created (account #${accountId})`);
        await this.keyring.remember(username, input.password);
        const session = await this.startSession(sender, await this.requireAccount(accountId));
        return { session, recoveryCode };
    }

    /** What `setup` refuses, checked before starting over so nothing moves for a typo. */
    checkSetup(input: SetupInput): { username: string; displayName: string } {
        const username = validateUsername(input?.username);
        const displayName = validateDisplayName(input?.displayName);
        this.policy.assertValid(input?.password);
        return { username, displayName };
    }

    /**
     * The administrator named on the restore of a computer without accounts: checked like the
     * first administrator, nothing is written here (BackupService adds it to the restored data).
     */
    async prepareAdministrator(input: {
        username?: unknown;
        password?: unknown;
    }): Promise<KeptAccount> {
        const username = validateUsername(input?.username);
        this.policy.assertValid(input?.password);
        return {
            username,
            displayName: username,
            passwordHash: await this.hasher.hash(input.password as string),
            recoveryCodeHash: null,
        };
    }

    async login(
        sender: WebContents,
        usernameInput: string,
        password: string,
    ): Promise<SessionInfo> {
        const username = normalizeUsername(usernameInput);
        // Locked data opens with the password of any account that could open it before.
        if (this.keyring.isLocked()) {
            if (!username || !(await this.keyring.unlock(username, password))) {
                throw new AppError('INVALID_CREDENTIALS');
            }
        }
        const account = username ? await this.accounts.findByUsername(username) : undefined;

        if (account?.locked_until && Date.parse(account.locked_until) > Date.now()) {
            throw new AppError('ACCOUNT_LOCKED', undefined, { lockedUntil: account.locked_until });
        }

        const valid = await this.hasher.verify(password, account?.password_hash);
        if (!account || !valid) {
            if (account) await this.registerFailedAttempt(account);
            throw new AppError('INVALID_CREDENTIALS');
        }
        if (!account.is_active) throw new AppError('ACCOUNT_INACTIVE');

        await this.accounts.update(account.id, {
            failed_login_count: 0,
            locked_until: null,
            last_login_at: new Date().toISOString(),
        });
        this.logger.info(`Login: account #${account.id}`);
        await this.keyring.remember(account.username, password);
        return this.startSession(sender, account);
    }

    logout(sender: WebContents): void {
        const session = this.sessions.get(sender);
        if (session) this.logger.info(`Logout: account #${session.accountId}`);
        this.sessions.clear(sender);
    }

    async changePassword(
        sender: WebContents,
        currentPassword: string,
        newPassword: string,
    ): Promise<SessionInfo> {
        const session = this.requireSession(sender);
        const account = await this.requireAccount(session.accountId);

        if (!(await this.hasher.verify(currentPassword, account.password_hash))) {
            throw new AppError('INVALID_CREDENTIALS', undefined, { field: 'currentPassword' });
        }
        this.policy.assertValid(newPassword);
        if (currentPassword === newPassword) {
            throw new AppError('VALIDATION', 'Новий пароль має відрізнятися від поточного', {
                field: 'newPassword',
            });
        }

        await this.accounts.update(account.id, {
            password_hash: await this.hasher.hash(newPassword),
            must_change_password: 0,
        });
        this.logger.info(`Password changed: account #${account.id}`);
        await this.keyring.remember(account.username, newPassword);
        return this.startSession(sender, await this.requireAccount(account.id));
    }

    /** Self-service reset with the one-time recovery code. The code is consumed. */
    async recover(usernameInput: string, code: string, newPassword: string): Promise<void> {
        const username = normalizeUsername(usernameInput);
        const account = username ? await this.accounts.findByUsername(username) : undefined;
        const normalizedCode = this.recoveryCodes.normalize(code);

        const valid = await this.hasher.verify(normalizedCode, account?.recovery_code_hash);
        if (!account || !account.recovery_code_hash || !valid) {
            if (account) await this.registerFailedAttempt(account);
            throw new AppError('INVALID_CREDENTIALS');
        }
        if (!account.is_active) throw new AppError('ACCOUNT_INACTIVE');
        this.policy.assertValid(newPassword);

        await this.accounts.update(account.id, {
            password_hash: await this.hasher.hash(newPassword),
            recovery_code_hash: null,
            must_change_password: 0,
            failed_login_count: 0,
            locked_until: null,
        });
        this.logger.warn(`Password recovered with recovery code: account #${account.id}`);
        await this.keyring.remember(account.username, newPassword);
    }

    /** Issues a new recovery code for the signed-in account; the previous one stops working. */
    async regenerateRecoveryCode(sender: WebContents, currentPassword: string): Promise<string> {
        const session = this.requireSession(sender);
        const account = await this.requireAccount(session.accountId);
        if (!(await this.hasher.verify(currentPassword, account.password_hash))) {
            throw new AppError('INVALID_CREDENTIALS', undefined, { field: 'currentPassword' });
        }
        const code = this.recoveryCodes.generate();
        await this.accounts.update(account.id, {
            recovery_code_hash: await this.hasher.hash(this.recoveryCodes.normalize(code)),
        });
        await this.startSession(sender, await this.requireAccount(account.id));
        this.logger.info(`Recovery code regenerated: account #${account.id}`);
        return code;
    }

    /** Rebuilds or ends sessions after admin changes (role edits, deactivation, deletion). */
    async refreshSessions(predicate: (s: SessionInfo) => boolean): Promise<void> {
        await this.sessions.refresh(predicate, async (session) => {
            const account = await this.accounts.findById(session.accountId);
            if (!account || !account.is_active) return null;
            return this.sessionFactory.build(account);
        });
    }

    private async startSession(sender: WebContents, account: AccountRow): Promise<SessionInfo> {
        const info = await this.sessionFactory.build(account);
        this.sessions.set(sender, info);
        return info;
    }

    private requireSession(sender: WebContents) {
        const session = this.sessions.get(sender);
        if (!session) throw new AppError('UNAUTHENTICATED');
        return session;
    }

    private async requireAccount(id: number): Promise<AccountRow> {
        const account = await this.accounts.findById(id);
        if (!account) throw new AppError('NOT_FOUND');
        return account;
    }

    private async registerFailedAttempt(account: AccountRow): Promise<void> {
        const attempts = account.failed_login_count + 1;
        const lock = attempts >= this.lockout.maxAttempts;
        await this.accounts.update(account.id, {
            failed_login_count: lock ? 0 : attempts,
            locked_until: lock
                ? new Date(Date.now() + this.lockout.lockMinutes * 60_000).toISOString()
                : account.locked_until,
        });
        if (lock)
            this.logger.warn(`Account #${account.id} locked after ${attempts} failed attempts`);
    }
}
