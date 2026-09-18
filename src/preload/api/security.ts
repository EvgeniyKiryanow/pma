import { ipcRenderer } from 'electron';

import { AUDIT_CHANNELS, type AuditPage, type AuditQuery } from '../../shared/audit/types';
import type {
    AccountDTO,
    AuthState,
    CreateAccountInput,
    RoleDTO,
    RoleInput,
    SessionInfo,
    SetupInput,
    UpdateAccountInput,
} from '../../shared/auth/types';
import {
    ACCOUNT_CHANNELS,
    AUTH_CHANNELS,
    AUTH_EVENTS,
    ROLE_CHANNELS,
} from '../../shared/ipc/channels';
import type { Result } from '../../shared/ipc/result';
import { invoke } from '../invoke';

/** Authentication (the session lives in the main process). */
export const authApi = {
    getState: () => invoke<Result<AuthState>>(AUTH_CHANNELS.getState),
    setup: (input: SetupInput) =>
        invoke<Result<{ session: SessionInfo; recoveryCode: string }>>(AUTH_CHANNELS.setup, input),
    login: (username: string, password: string) =>
        invoke<Result<SessionInfo>>(AUTH_CHANNELS.login, username, password),
    logout: () => invoke<Result<void>>(AUTH_CHANNELS.logout),
    changePassword: (currentPassword: string, newPassword: string) =>
        invoke<Result<SessionInfo>>(AUTH_CHANNELS.changePassword, currentPassword, newPassword),
    recover: (username: string, recoveryCode: string, newPassword: string) =>
        invoke<Result<void>>(AUTH_CHANNELS.recover, username, recoveryCode, newPassword),
    regenerateRecoveryCode: (currentPassword: string) =>
        invoke<Result<string>>(AUTH_CHANNELS.regenerateRecoveryCode, currentPassword),
};

export const accountsApi = {
    list: () => invoke<Result<AccountDTO[]>>(ACCOUNT_CHANNELS.list),
    create: (input: CreateAccountInput) =>
        invoke<Result<AccountDTO>>(ACCOUNT_CHANNELS.create, input),
    update: (id: number, input: UpdateAccountInput) =>
        invoke<Result<AccountDTO>>(ACCOUNT_CHANNELS.update, id, input),
    resetPassword: (id: number, temporaryPassword: string) =>
        invoke<Result<void>>(ACCOUNT_CHANNELS.resetPassword, id, temporaryPassword),
    unlock: (id: number) => invoke<Result<void>>(ACCOUNT_CHANNELS.unlock, id),
    remove: (id: number) => invoke<Result<void>>(ACCOUNT_CHANNELS.remove, id),
};

export const rolesApi = {
    list: () => invoke<Result<RoleDTO[]>>(ROLE_CHANNELS.list),
    create: (input: RoleInput) => invoke<Result<RoleDTO>>(ROLE_CHANNELS.create, input),
    update: (id: number, input: RoleInput) =>
        invoke<Result<RoleDTO>>(ROLE_CHANNELS.update, id, input),
    remove: (id: number) => invoke<Result<void>>(ROLE_CHANNELS.remove, id),
};

export const auditApi = {
    list: (query: AuditQuery) => invoke<Result<AuditPage>>(AUDIT_CHANNELS.list, query),
};

/** Pushes from the main process. Each subscription returns its unsubscribe function. */
export const eventsApi = {
    /** Session ended or permissions changed (logout elsewhere, restore, role edit). */
    onSessionChanged: (callback: () => void) => {
        const listener = () => callback();
        ipcRenderer.on(AUTH_EVENTS.sessionChanged, listener);
        return () => ipcRenderer.removeListener(AUTH_EVENTS.sessionChanged, listener);
    },
};
