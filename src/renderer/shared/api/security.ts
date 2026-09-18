import type { AuditPage, AuditQuery } from '../../../shared/audit/types';
import type {
    AccountDTO,
    AuthState,
    CreateAccountInput,
    RoleDTO,
    RoleInput,
    SessionInfo,
    SetupInput,
    UpdateAccountInput,
} from '../../../shared/auth/types';
import { bridge } from './bridge';
import { unwrap } from './call';

/** Sign-in and the current session (kept in the main process). Throws ApiError. */
export const authApi = {
    getState: (): Promise<AuthState> => unwrap(bridge().auth.getState()),
    setup: (input: SetupInput): Promise<{ session: SessionInfo; recoveryCode: string }> =>
        unwrap(bridge().auth.setup(input)),
    login: (username: string, password: string): Promise<SessionInfo> =>
        unwrap(bridge().auth.login(username, password)),
    logout: (): Promise<void> => unwrap(bridge().auth.logout()),
    changePassword: (currentPassword: string, newPassword: string): Promise<SessionInfo> =>
        unwrap(bridge().auth.changePassword(currentPassword, newPassword)),
    recover: (username: string, recoveryCode: string, newPassword: string): Promise<void> =>
        unwrap(bridge().auth.recover(username, recoveryCode, newPassword)),
    regenerateRecoveryCode: (currentPassword: string): Promise<string> =>
        unwrap(bridge().auth.regenerateRecoveryCode(currentPassword)),
    /** Session ended or permissions changed elsewhere; returns the unsubscribe function. */
    onSessionChanged: (callback: () => void): (() => void) =>
        bridge().events.onSessionChanged(callback),
};

export const accountsApi = {
    list: (): Promise<AccountDTO[]> => unwrap(bridge().accounts.list()),
    create: (input: CreateAccountInput): Promise<AccountDTO> =>
        unwrap(bridge().accounts.create(input)),
    update: (id: number, input: UpdateAccountInput): Promise<AccountDTO> =>
        unwrap(bridge().accounts.update(id, input)),
    resetPassword: (id: number, temporaryPassword: string): Promise<void> =>
        unwrap(bridge().accounts.resetPassword(id, temporaryPassword)),
    unlock: (id: number): Promise<void> => unwrap(bridge().accounts.unlock(id)),
    remove: (id: number): Promise<void> => unwrap(bridge().accounts.remove(id)),
};

export const rolesApi = {
    list: (): Promise<RoleDTO[]> => unwrap(bridge().roles.list()),
    create: (input: RoleInput): Promise<RoleDTO> => unwrap(bridge().roles.create(input)),
    update: (id: number, input: RoleInput): Promise<RoleDTO> =>
        unwrap(bridge().roles.update(id, input)),
    remove: (id: number): Promise<void> => unwrap(bridge().roles.remove(id)),
};

export const auditApi = {
    list: (query: AuditQuery): Promise<AuditPage> => unwrap(bridge().audit.list(query)),
};
