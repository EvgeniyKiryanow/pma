import { baseline } from './001_baseline';
import { accountsAndPermissions } from './002_accounts_and_permissions';
import { recordIdentity } from './003_record_identity';
import { portableReportPaths } from './004_portable_report_paths';
import { auditLog } from './005_audit_log';
import { relaxUserConstraints } from './006_relax_user_constraints';
import { MigrationRunner } from './runner';

/** Append new migrations to the end. Never reorder, edit or remove released ones. */
export const MIGRATIONS = [
    baseline,
    accountsAndPermissions,
    recordIdentity,
    portableReportPaths,
    auditLog,
    relaxUserConstraints,
];

export const migrationRunner = new MigrationRunner(MIGRATIONS);
