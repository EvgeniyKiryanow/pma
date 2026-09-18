import { ALL_PERMISSION_KEYS, expandPermissions } from '../../../shared/auth/permissions';
import type { SessionInfo } from '../../../shared/auth/types';
import type { AccountRow } from '../repositories/AccountRepository';
import type { RoleRepository } from '../repositories/RoleRepository';

/** Builds the effective session (expanded permissions) for an account. */
export class SessionFactory {
    constructor(private readonly roles: RoleRepository) {}

    async build(account: AccountRow): Promise<SessionInfo> {
        const grantsAll = Boolean(account.role_grants_all);
        const permissions = grantsAll
            ? [...ALL_PERMISSION_KEYS]
            : [...expandPermissions(await this.roles.permissionsOf(account.role_id))];

        return {
            accountId: account.id,
            username: account.username,
            displayName: account.display_name,
            roleId: account.role_id,
            roleName: account.role_name,
            grantsAll,
            permissions,
            mustChangePassword: Boolean(account.must_change_password),
            hasRecoveryCode: Boolean(account.recovery_code_hash),
        };
    }
}
