import { create } from 'zustand';

import type { PermissionKey } from '../../shared/auth/permissions';
import type { AuthState, SessionInfo, SetupInput } from '../../shared/auth/types';
import { unwrap } from '../shared/api/call';

export type AuthStatus = 'loading' | 'setup' | 'login' | 'change-password' | 'ready';

type SessionStore = {
    status: AuthStatus;
    session: SessionInfo | null;
    /** Shown once right after first-run setup, before entering the app. */
    pendingRecoveryCode: string | null;

    init: () => Promise<void>;
    refresh: () => Promise<void>;
    setup: (input: SetupInput) => Promise<void>;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    acknowledgeRecoveryCode: () => void;

    can: (permission: PermissionKey) => boolean;
    canAny: (...permissions: PermissionKey[]) => boolean;
};

function statusOf(state: AuthState): AuthStatus {
    if (!state.hasAccounts) return 'setup';
    if (!state.session) return 'login';
    if (state.session.mustChangePassword) return 'change-password';
    return 'ready';
}

/** Leaving a session reloads the renderer so no personnel data stays in memory. */
function reloadRenderer(): void {
    window.location.reload();
}

let subscribed = false;

/**
 * Mirror of the session held by the main process. The renderer never decides access on its
 * own: these checks only hide UI, every call is authorized again in the main process.
 */
export const useSessionStore = create<SessionStore>((set, get) => ({
    status: 'loading',
    session: null,
    pendingRecoveryCode: null,

    init: async () => {
        if (!subscribed) {
            subscribed = true;
            window.electronAPI.events.onSessionChanged(() => void get().refresh());
        }
        await get().refresh();
    },

    refresh: async () => {
        const hadSession = Boolean(get().session);
        const state = await unwrap(window.electronAPI.auth.getState());
        if (hadSession && !state.session) {
            reloadRenderer();
            return;
        }
        set({ status: statusOf(state), session: state.session });
    },

    setup: async (input) => {
        const { session, recoveryCode } = await unwrap(window.electronAPI.auth.setup(input));
        set({ session, status: 'ready', pendingRecoveryCode: recoveryCode });
    },

    login: async (username, password) => {
        const session = await unwrap(window.electronAPI.auth.login(username, password));
        set({ session, status: statusOf({ hasAccounts: true, session }) });
    },

    logout: async () => {
        await unwrap(window.electronAPI.auth.logout());
        reloadRenderer();
    },

    changePassword: async (currentPassword, newPassword) => {
        const session = await unwrap(
            window.electronAPI.auth.changePassword(currentPassword, newPassword),
        );
        set({ session, status: statusOf({ hasAccounts: true, session }) });
    },

    acknowledgeRecoveryCode: () => set({ pendingRecoveryCode: null }),

    can: (permission) => Boolean(get().session?.permissions.includes(permission)),
    canAny: (...permissions) => permissions.some((p) => get().session?.permissions.includes(p)),
}));

/** Hook for components: re-renders when the session (and so permissions) change. */
export function usePermissions() {
    const session = useSessionStore((s) => s.session);
    const permissions = new Set(session?.permissions ?? []);
    return {
        session,
        can: (permission: PermissionKey) => permissions.has(permission),
        canAny: (...keys: PermissionKey[]) => keys.some((k) => permissions.has(k)),
    };
}
