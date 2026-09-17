import type { WebContents } from 'electron';

import type { PermissionKey } from '../../shared/auth/permissions';
import type { SessionInfo } from '../../shared/auth/types';
import { AUTH_EVENTS } from '../../shared/ipc/channels';

export type Session = SessionInfo & {
    permissionSet: ReadonlySet<PermissionKey>;
    startedAt: number;
};

/**
 * Authentication state lives only in the main process, keyed by the window's WebContents.
 * The renderer never holds a token it could forge; it asks for the current session instead.
 */
export class SessionManager {
    private readonly sessions = new Map<number, { session: Session; sender: WebContents }>();

    get(sender: WebContents): Session | null {
        return this.sessions.get(sender.id)?.session ?? null;
    }

    set(sender: WebContents, info: SessionInfo): Session {
        const session: Session = {
            ...info,
            permissionSet: new Set(info.permissions),
            startedAt: Date.now(),
        };
        const isNew = !this.sessions.has(sender.id);
        this.sessions.set(sender.id, { session, sender });
        if (isNew) sender.once('destroyed', () => this.sessions.delete(sender.id));
        return session;
    }

    clear(sender: WebContents): void {
        this.sessions.delete(sender.id);
    }

    /** Ends every session (after restore/reset) and tells the windows to go back to login. */
    clearAll(): void {
        for (const { sender } of this.sessions.values()) this.notify(sender);
        this.sessions.clear();
    }

    /** Re-evaluates live sessions after an account or role changed. */
    async refresh(
        predicate: (session: Session) => boolean,
        rebuild: (session: Session) => Promise<SessionInfo | null>,
    ): Promise<void> {
        for (const [id, entry] of [...this.sessions.entries()]) {
            if (!predicate(entry.session)) continue;
            const next = await rebuild(entry.session);
            if (next) this.set(entry.sender, next);
            else this.sessions.delete(id);
            this.notify(entry.sender);
        }
    }

    private notify(sender: WebContents): void {
        if (!sender.isDestroyed()) sender.send(AUTH_EVENTS.sessionChanged);
    }
}

export const sessionManager = new SessionManager();

export function toSessionInfo(session: Session): SessionInfo {
    const { permissionSet: _set, startedAt: _started, ...info } = session;
    return info;
}
