import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';

import { AppError } from '../shared/ipc/result';
import { createContainer } from './app/container';
import { applySecurityPolicies, createMainWindow } from './app/window';
import {
    registerAccountsIpc,
    registerAuditIpc,
    registerAuthIpc,
    registerRolesIpc,
} from './auth/ipc';
import { registerBackupIpc } from './backup/ipc';
import { getInstanceId } from './core/instance';
import { createLogger } from './core/logger';
import { AppPaths } from './core/paths';
import { registerFeatureHandlers } from './ipc';
import { setAuditSink } from './ipc/secureHandle';

const isDev = !app.isPackaged;
const logger = createLogger('main');

// Development only: run against a separate data folder (e.g. a copy of a fixture database).
if (isDev && process.env.PMA_USER_DATA_DIR) {
    app.setPath('userData', path.resolve(process.env.PMA_USER_DATA_DIR));
}
// Development only: start, run migrations, print a report and exit (no window).
const smokeTest = isDev && process.argv.includes('--smoke-test');

let mainWindow: BrowserWindow | null = null;

process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', reason));
process.on('uncaughtException', (error) => logger.error('Uncaught exception', error));

if (!smokeTest && !app.requestSingleInstanceLock()) {
    // A second copy would write to the same database; focus the running one instead.
    app.quit();
} else {
    app.on('second-instance', () => {
        if (!mainWindow) return;
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    });

    app.whenReady()
        .then(bootstrap)
        .catch((error) => fatal(error));

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });

    app.on('activate', () => {
        if (!smokeTest && BrowserWindow.getAllWindows().length === 0)
            mainWindow = createMainWindow(isDev);
    });
}

async function bootstrap(): Promise<void> {
    logger.info(`Starting v${app.getVersion()} (${isDev ? 'development' : 'production'})`);
    const container = createContainer();
    getInstanceId();

    const db = await container.database.get();
    const tables = await db.get<{ n: number }>(
        `SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'`,
    );
    const isExistingDatabase = (tables?.n ?? 0) > 0;

    const report = await container.migrations.run(db, {
        log: (message) => logger.info(message),
        beforeMigrate: async (from, to) => {
            if (!isExistingDatabase) return;
            const snapshot = await container.backups.createSafetyDatabaseSnapshot(
                `pre-migration-v${from}-to-v${to}`,
            );
            logger.info(`Safety snapshot before migration: ${snapshot}`);
        },
    });
    await container.templates.ensureInstalled();

    setAuditSink(container.auditSink);
    registerAuthIpc(container.auth);
    registerAccountsIpc(container.accountService);
    registerRolesIpc(container.roleService);
    registerAuditIpc(container.audit);
    registerBackupIpc({
        backups: container.backups,
        settings: container.settings,
        scheduler: container.scheduler,
        hasAccounts: () => container.auth.hasAccounts(),
    });
    registerFeatureHandlers();

    if (smokeTest) {
        const summary = {
            userData: AppPaths.userData,
            migrations: report,
            schemaVersion: await container.migrations.currentVersion(db),
            accounts: await db.get(`SELECT COUNT(*) AS n FROM accounts`),
            roles: await db.all(`SELECT name, is_system, grants_all FROM roles`),
            personnel: await db.get(`SELECT COUNT(*) AS n FROM users`),
            missingUuids: await db.get(`SELECT COUNT(*) AS n FROM users WHERE uuid IS NULL`),
            // Optional scenario script (plain JS module exporting `async ({ container, app }) => result`).
            script: process.env.PMA_DEV_SCRIPT
                ? // eslint-disable-next-line @typescript-eslint/no-var-requires
                  await require(path.resolve(process.env.PMA_DEV_SCRIPT))({ container, app })
                : undefined,
        };
        process.stdout.write(`SMOKE_TEST_RESULT ${JSON.stringify(summary)}\n`);
        await container.database.close();
        app.exit(0);
        return;
    }

    container.scheduler.start();
    applySecurityPolicies(isDev);
    mainWindow = createMainWindow(isDev);
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    app.on('before-quit', () => {
        container.scheduler.stop();
        void container.database.close();
    });

    // Development only: drive the running window from a script (automated UI checks).
    if (isDev && process.env.PMA_DEV_SCRIPT) void runDevScript(container, mainWindow);
}

async function runDevScript(container: unknown, window: BrowserWindow): Promise<void> {
    await new Promise<void>((resolve) => window.webContents.once('did-finish-load', () => resolve()));
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const script = require(path.resolve(process.env.PMA_DEV_SCRIPT as string));
        const result = await script({ container, app, window });
        process.stdout.write(`DEV_SCRIPT_RESULT ${JSON.stringify(result)}\n`);
    } catch (error) {
        process.stdout.write(`DEV_SCRIPT_ERROR ${String((error as Error)?.stack ?? error)}\n`);
    }
    if (process.env.PMA_DEV_EXIT) app.exit(0);
}

function fatal(error: unknown): void {
    logger.error('Startup failed', error);
    if (smokeTest) {
        process.stdout.write(`SMOKE_TEST_ERROR ${String((error as Error)?.stack ?? error)}\n`);
        app.exit(1);
        return;
    }

    const logFile = path.join(AppPaths.userData, 'logs', 'main.log');
    if (error instanceof AppError && error.code === 'SCHEMA_TOO_NEW') {
        dialog.showErrorBox(
            'Потрібна новіша версія програми',
            'Дані на цьому компʼютері створені новішою версією PManager.\n' +
                'Встановіть актуальну версію програми. Дані не змінювались.',
        );
    } else {
        dialog.showErrorBox(
            'Не вдалося запустити PManager',
            'Під час запуску сталася помилка. Дані не змінювались: перед оновленням бази ' +
                'створюється резервна копія.\n\n' +
                `Журнал для діагностики: ${logFile}`,
        );
    }
    app.exit(1);
}
