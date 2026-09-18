import type { WebContents } from 'electron';

import type { Logger } from '../core/logger';
import type { SessionManager } from './SessionManager';

/** Input that means a person is at the keyboard or the mouse. */
const ACTIVITY = new Set<string>([
    'mouseDown',
    'mouseUp',
    'mouseMove',
    'mouseWheel',
    'rawKeyDown',
    'keyDown',
    'keyUp',
    'char',
    'touchStart',
    'touchMove',
    'gestureScrollBegin',
    'gestureScrollUpdate',
    'gestureTap',
]);

export type IdleLockDeps = {
    sessions: SessionManager;
    /** Current timeout in minutes (the security setting). */
    idleMinutes: () => Promise<number>;
    /** True while an IPC call of the window is running (export, restore...). */
    isBusy: (senderId: number) => boolean;
    /** When the window last finished a long operation — counts as activity. */
    lastLongCallEndedAt: (senderId: number) => number;
    logger: Logger;
    now?: () => number;
};

/**
 * Locks the screen after a period without input: the session in the main process ends and
 * the window returns to the sign-in screen, dropping everything it had loaded. Input is
 * observed in the main process (`input-event`), so the page cannot keep a session alive.
 *
 * The lock never interrupts an operation in progress; it happens as soon as the operation
 * is over and the person is still away. Locking Windows or putting the computer to sleep
 * locks the app at once.
 */
export class IdleLock {
    private readonly lastInput = new Map<number, number>();
    private timer: NodeJS.Timeout | null = null;
    private readonly now: () => number;

    constructor(private readonly deps: IdleLockDeps) {
        this.now = deps.now ?? Date.now;
        deps.sessions.onEnd((senderId) => this.lastInput.delete(senderId));
    }

    /** Starts listening to the window's keyboard and mouse. */
    watch(contents: WebContents): void {
        const id = contents.id;
        contents.on('input-event', (_event, input) => {
            if (ACTIVITY.has(input.type)) this.lastInput.set(id, this.now());
        });
        contents.once('destroyed', () => this.lastInput.delete(id));
    }

    start(checkEveryMs = 5_000): void {
        this.stop();
        this.timer = setInterval(() => void this.check(), checkEveryMs);
        this.timer.unref?.();
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    /** Ends every session whose window has been idle for longer than the timeout. */
    async check(): Promise<void> {
        const sessions = this.deps.sessions.entries();
        if (!sessions.length) return;
        let minutes: number;
        try {
            minutes = await this.deps.idleMinutes();
        } catch (err) {
            // The database may be closed for a moment (restore); try again on the next tick.
            this.deps.logger.warn('Idle lock: settings unavailable', err);
            return;
        }
        const limit = minutes * 60_000;
        for (const { senderId, session } of sessions) {
            if (this.deps.isBusy(senderId)) continue;
            const lastActive = Math.max(
                session.startedAt,
                this.lastInput.get(senderId) ?? 0,
                this.deps.lastLongCallEndedAt(senderId),
            );
            if (this.now() - lastActive < limit) continue;
            this.deps.logger.info(
                `Screen locked after ${minutes} min without input (account #${session.accountId})`,
            );
            this.deps.sessions.lock(senderId, { reason: 'idle', idleMinutes: minutes });
        }
    }

    /** Windows was locked or the computer is going to sleep. */
    async lockAll(): Promise<void> {
        const sessions = this.deps.sessions.entries();
        if (!sessions.length) return;
        const minutes = await this.deps.idleMinutes().catch(() => 0);
        for (const { senderId } of sessions) {
            this.deps.sessions.lock(senderId, { reason: 'system', idleMinutes: minutes });
        }
        this.deps.logger.info('Screen locked together with Windows');
    }
}
