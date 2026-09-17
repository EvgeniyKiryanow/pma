import { app } from 'electron';

import type { BackupSettings } from '../../shared/backup/types';
import { IPC_ERROR_PREFIX } from '../../shared/ipc/result';
import { AuditLog, summarizeArgs } from '../audit/AuditLog';
import { PasswordHasher, PasswordPolicy } from '../auth/PasswordHasher';
import { RecoveryCodes } from '../auth/RecoveryCodes';
import { AccountRepository } from '../auth/repositories/AccountRepository';
import { RoleRepository } from '../auth/repositories/RoleRepository';
import { AccountService } from '../auth/services/AccountService';
import { AuthService } from '../auth/services/AuthService';
import { RoleService } from '../auth/services/RoleService';
import { SessionFactory } from '../auth/services/SessionFactory';
import { sessionManager } from '../auth/SessionManager';
import { AutoBackupScheduler } from '../backup/AutoBackupScheduler';
import { BackupService } from '../backup/BackupService';
import { getInstanceId } from '../core/instance';
import { JsonStore } from '../core/JsonStore';
import { createLogger } from '../core/logger';
import { AppPaths } from '../core/paths';
import { database } from '../db/connection';
import { migrationRunner } from '../db/migrations';
import type { DbProvider } from '../db/types';
import { type AuditSink } from '../ipc/secureHandle';
import { TemplateInstaller } from '../reports/TemplateInstaller';

const DEFAULT_SETTINGS: BackupSettings = {
    autoBackup: { enabled: true, intervalDays: 1, keep: 14 },
    lastAutoBackupAt: null,
};

/**
 * Composition root: the only place where concrete classes are instantiated and wired.
 * Everything else receives its dependencies through constructors.
 */
export function createContainer() {
    const db: DbProvider = () => database.get();

    const accounts = new AccountRepository(db);
    const roles = new RoleRepository(db);
    const hasher = new PasswordHasher();
    const passwordPolicy = new PasswordPolicy();

    const auth = new AuthService(
        database,
        accounts,
        roles,
        sessionManager,
        new SessionFactory(roles),
        hasher,
        passwordPolicy,
        new RecoveryCodes(),
        createLogger('auth'),
    );
    const accountService = new AccountService(
        database,
        accounts,
        roles,
        hasher,
        passwordPolicy,
        auth,
        createLogger('accounts'),
    );
    const roleService = new RoleService(database, roles, auth, createLogger('roles'));

    const audit = new AuditLog(db, getInstanceId, createLogger('audit'));
    const templates = new TemplateInstaller(createLogger('templates'));
    const settings = new JsonStore<BackupSettings>(() => AppPaths.settingsFile, DEFAULT_SETTINGS);

    const backups = new BackupService({
        database,
        migrations: migrationRunner,
        sessions: sessionManager,
        templates,
        logger: createLogger('backup'),
        appVersion: () => app.getVersion(),
        instanceId: getInstanceId,
    });
    const scheduler = new AutoBackupScheduler(
        backups,
        settings,
        () => auth.hasAccounts(),
        createLogger('auto-backup'),
    );

    const auditSink: AuditSink = async ({ action, outcome, session, args, error }) => {
        const details: Record<string, unknown> = { ...(summarizeArgs(args) ?? {}) };
        const code = errorCode(error);
        if (code) details.error = code;
        await audit.record({
            action,
            outcome,
            accountId: session?.accountId ?? null,
            accountUsername: session?.username ?? null,
            details: Object.keys(details).length ? details : null,
        });
    };

    return {
        database,
        migrations: migrationRunner,
        sessions: sessionManager,
        auth,
        accountService,
        roleService,
        audit,
        auditSink,
        templates,
        settings,
        backups,
        scheduler,
    };
}

export type Container = ReturnType<typeof createContainer>;

/** Short error identifier for the audit trail — never a message that could contain data. */
function errorCode(error: unknown): string | null {
    if (!error) return null;
    if (typeof error === 'string') return error.slice(0, 64);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes(IPC_ERROR_PREFIX)) return message.split(IPC_ERROR_PREFIX)[1].slice(0, 64);
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : 'error';
}
