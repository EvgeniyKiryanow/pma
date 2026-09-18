import { randomUUID } from 'crypto';

import type {
    AccountDTO,
    CreateAccountInput,
    SessionInfo,
    UpdateAccountInput,
} from '../../../shared/auth/types';
import { AppError } from '../../../shared/ipc/result';
import type { Logger } from '../../core/logger';
import type { Transactor } from '../../db/types';
import { type DataKeyring, noKeyring } from '../DataKeyring';
import type { PasswordHasher, PasswordPolicy } from '../PasswordHasher';
import type { AccountRepository, AccountRow } from '../repositories/AccountRepository';
import type { RoleRepository } from '../repositories/RoleRepository';
import type { AuthService } from './AuthService';
import { validateDisplayName, validateId, validateUsername } from './validation';

/** An account carried into restored data: same login, same password, administrator. */
export type KeptAccount = {
    username: string;
    displayName: string;
    passwordHash: string;
    recoveryCodeHash: string | null;
};

export function toAccountDTO(row: AccountRow): AccountDTO {
    return {
        id: row.id,
        uuid: row.uuid,
        username: row.username,
        displayName: row.display_name,
        roleId: row.role_id,
        roleName: row.role_name,
        roleGrantsAll: Boolean(row.role_grants_all),
        isActive: Boolean(row.is_active),
        mustChangePassword: Boolean(row.must_change_password),
        hasRecoveryCode: Boolean(row.recovery_code_hash),
        lockedUntil:
            row.locked_until && Date.parse(row.locked_until) > Date.now() ? row.locked_until : null,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
    };
}

/** Administration of accounts. Invariant: at least one active administrator always exists. */
export class AccountService {
    constructor(
        private readonly database: Transactor,
        private readonly accounts: AccountRepository,
        private readonly roles: RoleRepository,
        private readonly hasher: PasswordHasher,
        private readonly policy: PasswordPolicy,
        private readonly auth: AuthService,
        private readonly logger: Logger,
        /** An account that loses its password stops being able to open the data. */
        private readonly keyring: DataKeyring = noKeyring,
    ) {}

    async list(): Promise<AccountDTO[]> {
        return (await this.accounts.list()).map(toAccountDTO);
    }

    /** New accounts must change the password chosen by the administrator on first login. */
    async create(actor: SessionInfo, input: CreateAccountInput): Promise<AccountDTO> {
        const username = validateUsername(input?.username);
        const displayName = validateDisplayName(input?.displayName);
        const roleId = validateId(input?.roleId, 'roleId');
        this.policy.assertValid(input?.password);
        const passwordHash = await this.hasher.hash(input.password);

        const id = await this.database.transaction(async () => {
            if (await this.accounts.findByUsername(username)) {
                throw new AppError('CONFLICT', 'Користувач з таким логіном вже існує', {
                    field: 'username',
                });
            }
            if (!(await this.roles.findById(roleId)))
                throw new AppError('NOT_FOUND', undefined, { field: 'roleId' });
            return this.accounts.create({
                uuid: randomUUID(),
                username,
                displayName,
                passwordHash,
                roleId,
                mustChangePassword: true,
            });
        });

        this.logger.info(`Account #${id} created by account #${actor.accountId}`);
        return toAccountDTO(await this.require(id));
    }

    async update(
        actor: SessionInfo,
        idInput: number,
        input: UpdateAccountInput,
    ): Promise<AccountDTO> {
        const id = validateId(idInput);
        let deactivated: string | null = null;

        await this.database.transaction(async () => {
            const account = await this.require(id);
            const patch: Parameters<AccountRepository['update']>[1] = {};

            if (input.displayName !== undefined) {
                patch.display_name = validateDisplayName(input.displayName);
            }

            if (input.roleId !== undefined && input.roleId !== account.role_id) {
                const role = await this.roles.findById(validateId(input.roleId, 'roleId'));
                if (!role) throw new AppError('NOT_FOUND', undefined, { field: 'roleId' });
                if (account.role_grants_all && !role.grants_all)
                    await this.assertNotLastAdmin(account);
                patch.role_id = role.id;
            }

            if (
                input.isActive !== undefined &&
                Boolean(input.isActive) !== Boolean(account.is_active)
            ) {
                if (!input.isActive) {
                    if (account.id === actor.accountId) {
                        throw new AppError(
                            'VALIDATION',
                            'Не можна деактивувати власний обліковий запис',
                        );
                    }
                    if (account.role_grants_all) await this.assertNotLastAdmin(account);
                }
                patch.is_active = input.isActive ? 1 : 0;
                if (!input.isActive) deactivated = account.username;
            }

            await this.accounts.update(id, patch);
        });
        if (deactivated) await this.keyring.forget(deactivated);

        this.logger.info(`Account #${id} updated by account #${actor.accountId}`);
        await this.auth.refreshSessions((s) => s.accountId === id);
        return toAccountDTO(await this.require(id));
    }

    /** Sets a temporary password; the user must replace it at next login. */
    async resetPassword(
        actor: SessionInfo,
        idInput: number,
        temporaryPassword: string,
    ): Promise<void> {
        const id = validateId(idInput);
        this.policy.assertValid(temporaryPassword);
        const account = await this.require(id);
        await this.accounts.update(id, {
            password_hash: await this.hasher.hash(temporaryPassword),
            must_change_password: 1,
            failed_login_count: 0,
            locked_until: null,
        });
        // The old password no longer opens the data; the new one will after the next sign-in.
        await this.keyring.forget(account.username);
        this.logger.warn(`Password of account #${id} reset by account #${actor.accountId}`);
        await this.auth.refreshSessions((s) => s.accountId === id);
    }

    async unlock(actor: SessionInfo, idInput: number): Promise<void> {
        const id = validateId(idInput);
        await this.require(id);
        await this.accounts.update(id, { failed_login_count: 0, locked_until: null });
        this.logger.info(`Account #${id} unlocked by account #${actor.accountId}`);
    }

    async remove(actor: SessionInfo, idInput: number): Promise<void> {
        const id = validateId(idInput);
        if (id === actor.accountId) {
            throw new AppError('VALIDATION', 'Не можна видалити власний обліковий запис');
        }
        const username = await this.database.transaction(async () => {
            const account = await this.require(id);
            if (account.role_grants_all) await this.assertNotLastAdmin(account);
            await this.accounts.delete(id);
            return account.username;
        });
        await this.keyring.forget(username);
        this.logger.warn(`Account #${id} deleted by account #${actor.accountId}`);
        await this.auth.refreshSessions((s) => s.accountId === id);
    }

    /**
     * Login and password (hashes) of an account, so the administrator who restores a backup
     * keeps signing in as before (see BackupService.restoreImport).
     */
    async credentials(id: number): Promise<KeptAccount | null> {
        const row = await this.accounts.findById(id);
        if (!row || !row.is_active) return null;
        return {
            username: row.username,
            displayName: row.display_name,
            passwordHash: row.password_hash,
            recoveryCodeHash: row.recovery_code_hash ?? null,
        };
    }

    private async require(id: number): Promise<AccountRow> {
        const account = await this.accounts.findById(id);
        if (!account) throw new AppError('NOT_FOUND');
        return account;
    }

    private async assertNotLastAdmin(account: AccountRow): Promise<void> {
        if ((await this.accounts.countActiveAdmins(account.id)) === 0) {
            throw new AppError('LAST_ADMIN', 'Має залишитися хоча б один активний адміністратор');
        }
    }
}
