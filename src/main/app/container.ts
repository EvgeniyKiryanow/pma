import { createAuditModule } from '../audit';
import { createAuthModule } from '../auth';
import { sessionManager } from '../auth/SessionManager';
import { createBackupModule } from '../backup';
import { createLogger } from '../core/logger';
import { database } from '../db/connection';
import { migrationRunner } from '../db/migrations';
import type { DbProvider } from '../db/types';
import { createDirectivesModule } from '../directives';
import { createNamedListModule } from '../named-list';
import { createPersonnelModule } from '../personnel';
import { createRemindersModule } from '../reminders';
import { createReportsModule } from '../reports';
import { createStaffingModule } from '../staffing';
import { createSyncModule } from '../sync';
import { ChangeJournal } from '../sync/ChangeJournal';
import { createSystemModule } from '../system';
import type { FeatureModule, ModuleContext } from './module';

/**
 * Composition root: the only place where modules are created and wired together.
 * Each feature builds its own classes in its `index.ts`; everything else receives its
 * dependencies through constructors.
 */
export function createContainer() {
    const db: DbProvider = () => database.get();
    const context: ModuleContext = {
        db,
        transactor: database,
        journal: new ChangeJournal(db),
        createLogger,
    };

    const auth = createAuthModule(context, sessionManager);
    const audit = createAuditModule(context);
    const reports = createReportsModule(context);
    const backup = createBackupModule(context, {
        database,
        migrations: migrationRunner,
        sessions: sessionManager,
        templates: reports.installer,
        hasAccounts: () => auth.auth.hasAccounts(),
    });

    /** Registration order does not matter: every channel is independent. */
    const modules: FeatureModule[] = [
        createSystemModule(context),
        auth,
        audit,
        backup,
        createPersonnelModule(context),
        createDirectivesModule(context),
        createStaffingModule(context),
        createNamedListModule(context),
        reports,
        createRemindersModule(context),
        createSyncModule(context),
    ];

    return {
        database,
        migrations: migrationRunner,
        sessions: sessionManager,
        auth: auth.auth,
        accountService: auth.accounts,
        roleService: auth.roles,
        audit: audit.log,
        auditSink: audit.sink,
        templates: reports.installer,
        settings: backup.settings,
        backups: backup.backups,
        scheduler: backup.scheduler,
        modules,
    };
}

export type Container = ReturnType<typeof createContainer>;
