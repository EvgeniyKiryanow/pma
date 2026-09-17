import { app, ipcMain, type IpcMainInvokeEvent } from 'electron';

import type { PermissionKey } from '../../shared/auth/permissions';
import {
    AppError,
    type ErrorCode,
    fail,
    IPC_ERROR_PREFIX,
    ok,
    type Result,
} from '../../shared/ipc/result';
import { type Session, sessionManager } from '../auth/SessionManager';
import { createLogger } from '../core/logger';

const logger = createLogger('ipc');

/**
 * Access rule of an IPC channel. Every channel must declare one explicitly.
 * - public:        allowed before login (window controls, login itself)
 * - session:       signed in, even while a password change is pending
 * - authenticated: signed in and no pending password change
 * - permission:    authenticated and holds at least one of the keys
 * - custom:        arbitrary async check (e.g. restore allowed on first run)
 */
export type AccessRule =
    | { type: 'public' }
    | { type: 'session' }
    | { type: 'authenticated' }
    | { type: 'permission'; anyOf: readonly PermissionKey[] }
    | { type: 'custom'; check: (session: Session | null) => boolean | Promise<boolean> };

export const access = {
    public: { type: 'public' } as AccessRule,
    session: { type: 'session' } as AccessRule,
    authenticated: { type: 'authenticated' } as AccessRule,
    any: (...anyOf: PermissionKey[]): AccessRule => ({ type: 'permission', anyOf }),
    custom: (check: (session: Session | null) => boolean | Promise<boolean>): AccessRule => ({
        type: 'custom',
        check,
    }),
};

export type IpcHandler = (event: IpcMainInvokeEvent, ...args: any[]) => unknown;

export type HandleOptions = {
    /** Record this call in the audit log. `true` uses the channel name as the action. */
    audit?: boolean | string;
};

export type AuditSink = (entry: {
    action: string;
    outcome: 'success' | 'denied' | 'failure';
    session: Session | null;
    args: unknown[];
    error?: unknown;
}) => void | Promise<void>;

let auditSink: AuditSink | null = null;

/** Wired by the composition root, keeps this module free of database dependencies. */
export function setAuditSink(sink: AuditSink): void {
    auditSink = sink;
}

const DEV_SERVER_ORIGIN = 'http://localhost:5173';

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
    const url = event.senderFrame?.url ?? '';
    if (url.startsWith('file://')) return true;
    return !app.isPackaged && url.startsWith(DEV_SERVER_ORIGIN);
}

function reject(code: ErrorCode): never {
    throw new Error(`${IPC_ERROR_PREFIX}${code}`);
}

async function authorize(rule: AccessRule, session: Session | null): Promise<void> {
    switch (rule.type) {
        case 'public':
            return;
        case 'custom':
            if (!(await rule.check(session))) reject(session ? 'FORBIDDEN' : 'UNAUTHENTICATED');
            return;
        case 'session':
            if (!session) reject('UNAUTHENTICATED');
            return;
        case 'authenticated':
        case 'permission':
            if (!session) reject('UNAUTHENTICATED');
            if (session.mustChangePassword) reject('PASSWORD_CHANGE_REQUIRED');
            if (
                rule.type === 'permission' &&
                !rule.anyOf.some((p) => session.permissionSet.has(p))
            ) {
                reject('FORBIDDEN');
            }
            return;
    }
}

/** Registers an IPC handler that is only invoked after the sender and access rule are verified. */
export function handle(
    channel: string,
    rule: AccessRule,
    handler: IpcHandler,
    options: HandleOptions = {},
): void {
    const auditAction = options.audit ? (options.audit === true ? channel : options.audit) : null;

    ipcMain.handle(channel, async (event, ...args) => {
        if (!isTrustedSender(event)) {
            logger.error(`Rejected ${channel} from untrusted frame`);
            reject('FORBIDDEN');
        }
        const session = sessionManager.get(event.sender);
        try {
            await authorize(rule, session);
        } catch (err) {
            logger.warn(`Denied ${channel} (account #${session?.accountId ?? '-'})`);
            if (auditAction)
                await auditSink?.({ action: auditAction, outcome: 'denied', session, args });
            throw err;
        }

        if (!auditAction) return handler(event, ...args);

        try {
            const result = await handler(event, ...args);
            const failed = isFailResult(result);
            await auditSink?.({
                action: auditAction,
                outcome: failed ? 'failure' : 'success',
                session: sessionManager.get(event.sender) ?? session,
                args,
                error: failed ? (result as { error: string }).error : undefined,
            });
            return result;
        } catch (err) {
            await auditSink?.({
                action: auditAction,
                outcome: 'failure',
                session,
                args,
                error: err,
            });
            throw err;
        }
    });
}

function isFailResult(value: unknown): boolean {
    return Boolean(value && typeof value === 'object' && (value as { ok?: unknown }).ok === false);
}

/** Like `handle`, but converts domain errors (AppError) into a `Result` envelope. */
export function handleResult<T>(
    channel: string,
    rule: AccessRule,
    handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<T> | T,
    options: HandleOptions = {},
): void {
    handle(
        channel,
        rule,
        async (event, ...args): Promise<Result<T>> => {
            try {
                return ok(await handler(event, ...args));
            } catch (err) {
                if (err instanceof AppError) return fail(err.code, err.message, err.details);
                logger.error(`Unhandled error in ${channel}`, err);
                return fail('INTERNAL');
            }
        },
        options,
    );
}

/** Current session of the caller; throws if the rule let an anonymous call through. */
export function requireSession(event: IpcMainInvokeEvent): Session {
    const session = sessionManager.get(event.sender);
    if (!session) throw new AppError('UNAUTHENTICATED');
    return session;
}
