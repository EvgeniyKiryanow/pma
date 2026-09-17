export type AuditOutcome = 'success' | 'denied' | 'failure';

export type AuditEntryDTO = {
    id: number;
    occurredAt: string;
    instanceId: string | null;
    accountId: number | null;
    accountUsername: string | null;
    action: string;
    outcome: AuditOutcome;
    details: Record<string, unknown> | null;
};

export type AuditQuery = {
    limit?: number;
    offset?: number;
    accountId?: number;
    action?: string;
    outcome?: AuditOutcome;
};

export type AuditPage = {
    items: AuditEntryDTO[];
    total: number;
};

export const AUDIT_CHANNELS = {
    list: 'audit:list',
} as const;
