import { createAuditModule } from '../audit';
import { createAuthModule } from '../auth';
import { IdleLock } from '../auth/IdleLock';
import { sessionManager } from '../auth/SessionManager';
import { createBackupModule } from '../backup';
import { dialogActivity } from '../core/dialogs';
import { createLogger, destroyLogFiles } from '../core/logger';
import { database } from '../db/connection';
import { migrationRunner } from '../db/migrations';
import type { DbProvider } from '../db/types';
import { createDirectivesModule } from '../directives';
import { createFilesModule } from '../files';
import { callActivity } from '../ipc/secureHandle';
import { createNamedListModule } from '../named-list';
import { createPersonnelModule } from '../personnel';
import { createRemindersModule } from '../reminders';
import { createReportsModule } from '../reports';
import { dataEncryptor, dataVault } from '../security';
import { DataGate } from '../security/DataGate';
import { createSettingsModule } from '../settings';
import { createStaffingModule } from '../staffing';
import { createSyncModule } from '../sync';
import { ChangeJournal } from '../sync/ChangeJournal';
import { createSystemModule } from '../system';
import type { FeatureModule, ModuleContext } from './module';
import { clearBrowserData } from './window';

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

    const settings = createSettingsModule(context);
    const files = createFilesModule(context);
    const dataGate = new DataGate(dataVault, createLogger('data-key'));
    const auth = createAuthModule(context, sessionManager, dataGate);
    const audit = createAuditModule(context);
    const reports = createReportsModule(context);
    const backup = createBackupModule(context, {
        database,
        migrations: migrationRunner,
        sessions: sessionManager,
        templates: reports.installer,
        hasAccounts: () => auth.auth.hasAccounts(),
        accountToKeep: async (sender) => {
            const session = sessionManager.get(sender);
            return session ? auth.accounts.credentials(session.accountId) : null;
        },
        newAdministrator: (input) => auth.auth.prepareAdministrator(input),
        checkSetup: (input) => auth.auth.checkSetup(input),
        setup: (sender, input) => auth.auth.setup(sender, input),
        finishOpening: () => dataGate.finishOpening(),
        onDataReplaced: () => settings.settings.forget(),
        clearBrowserData,
        destroyLogs: destroyLogFiles,
        vault: dataVault,
        encryptor: dataEncryptor,
    });

    const idleLock = new IdleLock({
        sessions: sessionManager,
        idleMinutes: async () => (await settings.settings.getSecurity()).idleLockMinutes,
        // A running export or restore postpones the lock; a file dialog left open does not.
        isBusy: (senderId) => callActivity.isBusy(senderId) && !dialogActivity.isOpen(senderId),
        lastLongCallEndedAt: callActivity.lastLongCallEndedAt,
        logger: createLogger('idle-lock'),
    });
    // Text the app copied leaves the clipboard when the session ends (lock, logout, restore).
    sessionManager.onEnd(() => files.clipboard.clearIfOurs());

    /** Registration order does not matter: every channel is independent. */
    const modules: FeatureModule[] = [
        createSystemModule(context, { hasAccounts: () => auth.auth.hasAccounts() }),
        auth,
        audit,
        settings,
        files,
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
        appSettings: settings.settings,
        backups: backup.backups,
        scheduler: backup.scheduler,
        clipboard: files.clipboard,
        idleLock,
        vault: dataVault,
        dataGate,
        encryptor: dataEncryptor,
        modules,
    };
}

export type Container = ReturnType<typeof createContainer>;
