import { app } from 'electron';

import type { BackupSettings } from '../../shared/backup/types';
import { defineModule, type ModuleContext } from '../app/module';
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

const DEFAULT_SETTINGS: BackupSettings = {
    autoBackup: { enabled: true, intervalDays: 1, keep: 14 },
    lastAutoBackupAt: null,
};

type BackupModuleDeps = {
    /** Backups close, replace and reopen the database file, so they need the manager itself. */
    database: DatabaseManager;
    migrations: MigrationRunner;
    sessions: SessionManager;
    templates: TemplateInstaller;
    hasAccounts: () => Promise<boolean>;
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
    });
    const scheduler = new AutoBackupScheduler(
        backups,
        settings,
        deps.hasAccounts,
        context.createLogger('auto-backup'),
    );

    return defineModule({
        name: 'backup',
        backups,
        settings,
        scheduler,
        registerIpc: () =>
            registerBackupIpc({ backups, settings, scheduler, hasAccounts: deps.hasAccounts }),
    });
}
