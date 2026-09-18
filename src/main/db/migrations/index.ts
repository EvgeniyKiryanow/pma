import { baseline } from './001_baseline';
import { accountsAndPermissions } from './002_accounts_and_permissions';
import { recordIdentity } from './003_record_identity';
import { portableReportPaths } from './004_portable_report_paths';
import { auditLog } from './005_audit_log';
import { relaxUserConstraints } from './006_relax_user_constraints';
import { appSettings } from './007_app_settings';
import { statusNames } from './008_status_names';
import { attachedPersonnel } from './009_attached_personnel';
import { personalCard } from './010_personal_card';
import { reportKinds } from './011_report_kinds';
import { MigrationRunner } from './runner';

/** Append new migrations to the end. Never reorder, edit or remove released ones. */
export const MIGRATIONS = [
    baseline,
    accountsAndPermissions,
    recordIdentity,
    portableReportPaths,
    auditLog,
    relaxUserConstraints,
    appSettings,
    statusNames,
    attachedPersonnel,
    personalCard,
    reportKinds,
];

export const migrationRunner = new MigrationRunner(MIGRATIONS);
