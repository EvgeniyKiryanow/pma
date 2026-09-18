import type { WebContents } from 'electron';

import type { PermissionKey } from '../../shared/auth/permissions';
import type { SessionInfo, SessionLock } from '../../shared/auth/types';
import { AUTH_EVENTS } from '../../shared/ipc/channels';

export type Session = SessionInfo & {
    permissionSet: ReadonlySet<PermissionKey>;
    startedAt: number;
};

type Listener = (senderId: number) => void;

/**
 * Authentication state lives only in the main process, keyed by the window's WebContents.
 * The renderer never holds a token it could forge; it asks for the current session instead.
 */
export class SessionManager {
    private readonly sessions = new Map<number, { session: Session; sender: WebContents }>();
    /** Windows whose session was ended automatically (idle, Windows lock) — until next sign-in. */
    private readonly locks = new Map<number, SessionLock>();
    private readonly endListeners = new Set<Listener>();
    /** Windows we already listen to, so repeated sign-ins do not stack listeners. */
    private readonly watched = new WeakSet<WebContents>();

    get(sender: WebContents): Session | null {
        return this.sessions.get(sender.id)?.session ?? null;
    }

    set(sender: WebContents, info: SessionInfo): Session {
        const session: Session = {
            ...info,
            permissionSet: new Set(info.permissions),
            startedAt: Date.now(),
        };
        this.sessions.set(sender.id, { session, sender });
        this.locks.delete(sender.id);
        if (!this.watched.has(sender)) {
            this.watched.add(sender);
            const id = sender.id;
            sender.once('destroyed', () => {
                this.end(id);
                this.locks.delete(id);
            });
        }
        return session;
    }

    clear(sender: WebContents): void {
        this.end(sender.id);
    }

    /** Live sessions with their windows (idle lock walks through them). */
    entries(): { senderId: number; session: Session }[] {
        return [...this.sessions.entries()].map(([senderId, entry]) => ({
            senderId,
            session: entry.session,
        }));
    }

    /** Why the last session of this window was ended automatically, if it was. */
    lockOf(sender: WebContents): SessionLock | null {
        return this.locks.get(sender.id) ?? null;
    }

    /**
     * Ends a session without the user asking (idle timeout, Windows locked) and tells the
     * window, which goes back to the sign-in screen and drops everything it had loaded.
     */
    lock(senderId: number, lock: Omit<SessionLock, 'username'>): void {
        const entry = this.sessions.get(senderId);
        if (!entry) return;
        this.locks.set(senderId, { ...lock, username: entry.session.username });
        this.end(senderId);
        this.notify(entry.sender);
    }

    /** Ends every session (after restore/reset) and tells the windows to go back to login. */
    clearAll(): void {
        for (const [senderId, { sender }] of [...this.sessions.entries()]) {
            this.end(senderId);
            this.notify(sender);
        }
    }

    /** Called whenever a session ends, however it ended (logout, lock, restore). */
    onEnd(listener: Listener): () => void {
        this.endListeners.add(listener);
        return () => this.endListeners.delete(listener);
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
            else this.end(id);
            this.notify(entry.sender);
        }
    }

    private end(senderId: number): void {
        if (!this.sessions.delete(senderId)) return;
        for (const listener of this.endListeners) listener(senderId);
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
