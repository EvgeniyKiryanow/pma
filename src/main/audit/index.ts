import { IPC_ERROR_PREFIX } from '../../shared/ipc/result';
import { defineModule, type ModuleContext } from '../app/module';
import { getInstanceId } from '../core/instance';
import type { AuditSink } from '../ipc/secureHandle';
import { AuditLog, summarizeArgs } from './AuditLog';
import { registerAuditIpc } from './ipc';

/** Short error identifier for the audit trail — never a message that could contain data. */
function errorCode(error: unknown): string | null {
    if (!error) return null;
    if (typeof error === 'string') return error.slice(0, 64);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes(IPC_ERROR_PREFIX)) return message.split(IPC_ERROR_PREFIX)[1].slice(0, 64);
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : 'error';
}

/** Append-only audit journal; `sink` receives every audited IPC call. */
export function createAuditModule(context: ModuleContext) {
    const log = new AuditLog(context.db, getInstanceId, context.createLogger('audit'));

    const sink: AuditSink = async ({ action, outcome, session, args, error }) => {
        const details: Record<string, unknown> = { ...(summarizeArgs(args) ?? {}) };
        const code = errorCode(error);
        if (code) details.error = code;
        await log.record({
            action,
            outcome,
            accountId: session?.accountId ?? null,
            accountUsername: session?.username ?? null,
            details: Object.keys(details).length ? details : null,
        });
    };

    return defineModule({
        name: 'audit',
        log,
        sink,
        registerIpc: () => registerAuditIpc(log),
    });
}
