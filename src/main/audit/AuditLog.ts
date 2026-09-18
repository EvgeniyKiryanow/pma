import type { AuditOutcome, AuditPage, AuditQuery } from '../../shared/audit/types';
import type { Logger } from '../core/logger';
import type { DbProvider } from '../db/types';

export type AuditRecord = {
    action: string;
    outcome: AuditOutcome;
    accountId?: number | null;
    accountUsername?: string | null;
    details?: Record<string, unknown> | null;
};

type AuditRow = {
    id: number;
    occurred_at: string;
    instance_id: string | null;
    account_id: number | null;
    account_username: string | null;
    action: string;
    outcome: AuditOutcome;
    details: string | null;
};

/**
 * Writes to the append-only `audit_log` table. Recording must never break the action being
 * audited, so failures are logged to the file log instead of being thrown.
 */
export class AuditLog {
    constructor(
        private readonly db: DbProvider,
        private readonly instanceId: () => string,
        private readonly logger: Logger,
    ) {}

    async record(entry: AuditRecord): Promise<void> {
        try {
            await (
                await this.db()
            ).run(
                `INSERT INTO audit_log (instance_id, account_id, account_username, action, outcome, details)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                this.instanceId(),
                entry.accountId ?? null,
                entry.accountUsername ?? null,
                entry.action,
                entry.outcome,
                entry.details ? JSON.stringify(entry.details) : null,
            );
        } catch (err) {
            this.logger.error(`Audit record failed for ${entry.action}`, err);
        }
    }

    async list(query: AuditQuery = {}): Promise<AuditPage> {
        const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);
        const offset = Math.max(Number(query.offset) || 0, 0);
        const where: string[] = [];
        const params: unknown[] = [];

        if (query.accountId) {
            where.push('account_id = ?');
            params.push(Number(query.accountId));
        }
        if (query.action) {
            where.push('action LIKE ?');
            params.push(`%${String(query.action)}%`);
        }
        if (query.outcome) {
            where.push('outcome = ?');
            params.push(query.outcome);
        }
        const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const db = await this.db();

        const rows = await db.all<AuditRow[]>(
            `SELECT * FROM audit_log ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`,
            ...params,
            limit,
            offset,
        );
        const total =
            (
                await db.get<{ n: number }>(
                    `SELECT COUNT(*) AS n FROM audit_log ${clause}`,
                    ...params,
                )
            )?.n ?? 0;

        return {
            total,
            items: rows.map((row) => ({
                id: row.id,
                occurredAt: row.occurred_at,
                instanceId: row.instance_id,
                accountId: row.account_id,
                accountUsername: row.account_username,
                action: row.action,
                outcome: row.outcome,
                details: parseDetails(row.details),
            })),
        };
    }
}

function parseDetails(value: string | null): Record<string, unknown> | null {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

/**
 * Extracts only numeric identifiers from IPC arguments — enough to know which record
 * was touched, without copying personal data into the audit trail.
 */
export function summarizeArgs(args: unknown[]): Record<string, unknown> | null {
    const ids: Record<string, number> = {};
    const collect = (prefix: string, value: unknown) => {
        if (typeof value === 'number' && Number.isFinite(value)) ids[prefix] = value;
    };
    args.forEach((arg, index) => {
        collect(`arg${index}`, arg);
        if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
            for (const key of ['id', 'userId', 'roleId', 'accountId']) {
                collect(key, (arg as Record<string, unknown>)[key]);
            }
        }
        if (Array.isArray(arg)) ids[`arg${index}Count`] = arg.length;
    });
    return Object.keys(ids).length ? ids : null;
}
