import type { PermissionKey } from './permissions';

export type SessionInfo = {
    accountId: number;
    username: string;
    displayName: string;
    roleId: number;
    roleName: string;
    grantsAll: boolean;
    permissions: PermissionKey[];
    mustChangePassword: boolean;
    hasRecoveryCode: boolean;
};

/** Why the last session of this window ended without the user signing out. */
export type SessionLock = {
    reason: 'idle' | 'system';
    username: string;
    /** Idle timeout that applied, for the message on the sign-in screen. */
    idleMinutes: number;
};

export type AuthState = {
    /** false on a fresh install: the renderer shows the first-run setup screen. */
    hasAccounts: boolean;
    session: SessionInfo | null;
    /** Set after an automatic lock until someone signs in again. */
    lock: SessionLock | null;
    /**
     * The encrypted data could not be opened automatically (Windows password was reset, new
     * Windows profile): the next PManager sign-in opens it.
     */
    dataLocked?: boolean;
};

export type AccountDTO = {
    id: number;
    uuid: string;
    username: string;
    displayName: string;
    roleId: number;
    roleName: string;
    roleGrantsAll: boolean;
    isActive: boolean;
    mustChangePassword: boolean;
    hasRecoveryCode: boolean;
    lockedUntil: string | null;
    lastLoginAt: string | null;
    createdAt: string;
};

export type RoleDTO = {
    id: number;
    uuid: string;
    name: string;
    description: string;
    isSystem: boolean;
    grantsAll: boolean;
    permissions: PermissionKey[];
    accountCount: number;
};

export type CreateAccountInput = {
    username: string;
    displayName?: string;
    password: string;
    roleId: number;
};

export type UpdateAccountInput = {
    displayName?: string;
    roleId?: number;
    isActive?: boolean;
};

export type RoleInput = {
    name: string;
    description?: string;
    permissions: PermissionKey[];
};

export type SetupInput = {
    username: string;
    displayName?: string;
    password: string;
};

export type PasswordRules = {
    minLength: number;
};

export const PASSWORD_RULES: PasswordRules = { minLength: 8 };
