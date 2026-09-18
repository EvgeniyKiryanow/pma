import { app, type WebContents } from 'electron';
import path from 'path';

import type { SessionInfo, SetupInput } from '../../shared/auth/types';
import type { BackupSettings } from '../../shared/backup/types';
import { AppError } from '../../shared/ipc/result';
import { defineModule, type ModuleContext } from '../app/module';
import type { KeptAccount } from '../auth/services/AccountService';
import type { SessionManager } from '../auth/SessionManager';
import { getInstanceId } from '../core/instance';
import { JsonStore } from '../core/JsonStore';
import { AppPaths } from '../core/paths';
import type { DatabaseManager } from '../db/connection';
import type { MigrationRunner } from '../db/migrations/runner';
import type { TemplateInstaller } from '../reports/TemplateInstaller';
import type { DataEncryptor } from '../security/DataEncryptor';
import type { DataVault } from '../security/DataVault';
import { AutoBackupScheduler } from './AutoBackupScheduler';
import { BackupService } from './BackupService';
import { registerBackupIpc } from './ipc';
import { Uninstaller } from './Uninstaller';

const DEFAULT_SETTINGS: BackupSettings = {
    autoBackup: { enabled: true, intervalDays: 1, keep: 14 },
    lastAutoBackupAt: null,
    lastFullBackupAt: null,
    remindAfterDays: 7,
};

type BackupModuleDeps = {
    /** Backups close, replace and reopen the database file, so they need the manager itself. */
    database: DatabaseManager;
    migrations: MigrationRunner;
    sessions: SessionManager;
    templates: TemplateInstaller;
    hasAccounts: () => Promise<boolean>;
    /** The administrator restoring a backup keeps their login (see BackupService). */
    accountToKeep?: (sender: WebContents) => Promise<KeptAccount | null>;
    /** Checks the administrator named on a restore of a computer without accounts. */
    newAdministrator?: (input: { username?: unknown; password?: unknown }) => Promise<KeptAccount>;
    /** «Почати з нуля» on the sign-in screen: checks and runs the first-run setup. */
    checkSetup?: (input: SetupInput) => void;
    setup?: (
        sender: WebContents,
        input: SetupInput,
    ) => Promise<{ session: SessionInfo; recoveryCode: string }>;
    /** Finishes a start-up that waited for a sign-in to open the data. */
    finishOpening?: () => Promise<void>;
    onDataReplaced?: () => void;
    clearBrowserData?: () => Promise<void>;
    destroyLogs?: () => Promise<number>;
    vault?: DataVault;
    encryptor?: DataEncryptor;
};

/** Full encrypted backups, restore, automatic snapshots and full reset. */
export function createBackupModule(context: ModuleContext, deps: BackupModuleDeps) {
    const settings = new JsonStore<BackupSettings>(() => AppPaths.settingsFile, DEFAULT_SETTINGS);
    const backups = new BackupService({
        database: deps.database,
        migrations: deps.migrations,
        sessions: deps.sessions,
        templates: deps.templates,
        logger: context.createLogger('backup'),
        appVersion: () => app.getVersion(),
        instanceId: getInstanceId,
        onDataReplaced: deps.onDataReplaced,
        clearBrowserData: deps.clearBrowserData,
        destroyLogs: deps.destroyLogs,
        vault: deps.vault,
        encryptor: deps.encryptor,
        finishOpening: deps.finishOpening,
    });
    const scheduler = new AutoBackupScheduler(
        backups,
        settings,
        deps.hasAccounts,
        context.createLogger('auto-backup'),
    );

    const uninstaller = new Uninstaller(context.createLogger('uninstall'), {
        packaged: () => app.isPackaged,
        programDir: () => path.dirname(process.execPath),
        exit: () => app.exit(0),
    });

    return defineModule({
        name: 'backup',
        backups,
        settings,
        scheduler,
        registerIpc: () =>
            registerBackupIpc({
                backups,
                settings,
                scheduler,
                accountToKeep: deps.accountToKeep ?? (async () => null),
                newAdministrator:
                    deps.newAdministrator ??
                    (async () => {
                        throw new AppError('INTERNAL', 'No administrator factory');
                    }),
                checkSetup:
                    deps.checkSetup ??
                    (() => {
                        throw new AppError('INTERNAL', 'No setup');
                    }),
                setup:
                    deps.setup ??
                    (async () => {
                        throw new AppError('INTERNAL', 'No setup');
                    }),
                uninstaller,
            }),
    });
}
