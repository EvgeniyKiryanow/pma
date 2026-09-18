import { AUDIT_CHANNELS, type AuditQuery } from '../../shared/audit/types';
import { access, handleResult } from '../ipc/secureHandle';
import type { AuditLog } from './AuditLog';

export function registerAuditIpc(audit: AuditLog): void {
    handleResult(AUDIT_CHANNELS.list, access.any('audit.view'), (_event, query: AuditQuery) =>
        audit.list(query),
    );
}
