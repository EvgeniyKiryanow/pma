import { ACCOUNT_CHANNELS, AUTH_CHANNELS, ROLE_CHANNELS } from '../../shared/ipc/channels';
import { access, handleResult, requireSession } from '../ipc/secureHandle';
import type { AccountService } from './services/AccountService';
import type { AuthService } from './services/AuthService';
import type { RoleService } from './services/RoleService';
import { toSessionInfo } from './SessionManager';

type InvokeEvent = Parameters<typeof requireSession>[0];
const actor = (event: InvokeEvent) => toSessionInfo(requireSession(event));

export function registerAuthIpc(auth: AuthService): void {
    handleResult(AUTH_CHANNELS.getState, access.public, (event) => auth.getState(event.sender));

    handleResult(
        AUTH_CHANNELS.setup,
        access.custom(async () => !(await auth.hasAccounts())),
        (event, input) => auth.setup(event.sender, input),
        { audit: 'auth.setup' },
    );

    handleResult(
        AUTH_CHANNELS.login,
        access.public,
        (event, username: string, password: string) => auth.login(event.sender, username, password),
        { audit: 'auth.login' },
    );

    handleResult(AUTH_CHANNELS.logout, access.public, (event) => auth.logout(event.sender), {
        audit: 'auth.logout',
    });

    handleResult(
        AUTH_CHANNELS.changePassword,
        access.session,
        (event, currentPassword: string, newPassword: string) =>
            auth.changePassword(event.sender, currentPassword, newPassword),
        { audit: 'auth.change-password' },
    );

    handleResult(
        AUTH_CHANNELS.recover,
        access.public,
        (_event, username: string, code: string, newPassword: string) =>
            auth.recover(username, code, newPassword),
        { audit: 'auth.recover' },
    );

    handleResult(
        AUTH_CHANNELS.regenerateRecoveryCode,
        access.authenticated,
        (event, currentPassword: string) =>
            auth.regenerateRecoveryCode(event.sender, currentPassword),
        { audit: 'auth.regenerate-recovery-code' },
    );
}

export function registerAccountsIpc(accounts: AccountService): void {
    const manage = access.any('accounts.manage');

    handleResult(ACCOUNT_CHANNELS.list, manage, () => accounts.list());
    handleResult(
        ACCOUNT_CHANNELS.create,
        manage,
        (event, input) => accounts.create(actor(event), input),
        {
            audit: 'accounts.create',
        },
    );
    handleResult(
        ACCOUNT_CHANNELS.update,
        manage,
        (event, id: number, input) => accounts.update(actor(event), id, input),
        { audit: 'accounts.update' },
    );
    handleResult(
        ACCOUNT_CHANNELS.resetPassword,
        manage,
        (event, id: number, password: string) => accounts.resetPassword(actor(event), id, password),
        { audit: 'accounts.reset-password' },
    );
    handleResult(
        ACCOUNT_CHANNELS.unlock,
        manage,
        (event, id: number) => accounts.unlock(actor(event), id),
        {
            audit: 'accounts.unlock',
        },
    );
    handleResult(
        ACCOUNT_CHANNELS.remove,
        manage,
        (event, id: number) => accounts.remove(actor(event), id),
        {
            audit: 'accounts.delete',
        },
    );
}

export function registerRolesIpc(roles: RoleService): void {
    const manage = access.any('roles.manage');

    // Account administrators need the role list to assign roles.
    handleResult(ROLE_CHANNELS.list, access.any('roles.manage', 'accounts.manage'), () =>
        roles.list(),
    );
    handleResult(
        ROLE_CHANNELS.create,
        manage,
        (event, input) => roles.create(actor(event), input),
        {
            audit: 'roles.create',
        },
    );
    handleResult(
        ROLE_CHANNELS.update,
        manage,
        (event, id: number, input) => roles.update(actor(event), id, input),
        { audit: 'roles.update' },
    );
    handleResult(
        ROLE_CHANNELS.remove,
        manage,
        (event, id: number) => roles.remove(actor(event), id),
        {
            audit: 'roles.delete',
        },
    );
}
