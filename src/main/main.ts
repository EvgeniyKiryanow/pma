import { app, BrowserWindow, dialog, powerMonitor } from 'electron';
import path from 'path';

import { AppError } from '../shared/ipc/result';
import { type Container, createContainer } from './app/container';
import { openDataSet, type OpenedDataSet, prepareDataKey } from './app/dataSet';
import { applySecurityPolicies, createMainWindow } from './app/window';
import { readWindowState } from './app/windowState';
import { getInstanceId } from './core/instance';
import { createLogger } from './core/logger';
import { AppPaths } from './core/paths';
import type { MigrationReport } from './db/migrations/runner';
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
            mainWindow = createMainWindow(isDev, readWindowState());
    });
}

async function bootstrap(): Promise<void> {
    logger.info(`Starting v${app.getVersion()} (${isDev ? 'development' : 'production'})`);
    const container = createContainer();
    getInstanceId();
    // Nothing else runs yet (single instance), so leftovers of a crashed export or restore
    // (decrypted archives) can be destroyed safely.
    await container.backups.purgeStaging();

    const openData = async (): Promise<OpenedDataSet> => {
        const opened = await openDataSet(container, logger);
        if (opened.setAside) await explainSetAside(opened.setAside);
        if (!smokeTest) container.scheduler.start();
        return opened;
    };

    const key = await prepareDataKey(container, logger);
    if (key.state === 'unlocked' && key.setAside) await explainSetAside(key.setAside);
    const opened = key.state === 'unlocked' ? await openData() : null;
    if (!opened) {
        // Windows could not open the key (its password was reset, another profile): the data
        // opens with the first PManager sign-in. A failure then is as fatal as one right now.
        container.dataGate.onUnlock(async () => {
            try {
                await openData();
            } catch (error) {
                fatal(error);
                throw error;
            }
        });
    }

    setAuditSink(container.auditSink);
    for (const feature of container.modules) feature.registerIpc();

    if (smokeTest) {
        const summary = opened
            ? await smokeTestSummary(container, opened.migrations)
            : { userData: AppPaths.userData, dataLocked: true };
        process.stdout.write(`SMOKE_TEST_RESULT ${JSON.stringify(summary)}\n`);
        await container.database.close();
        app.exit(0);
        return;
    }

    applySecurityPolicies(isDev);
    mainWindow = createMainWindow(isDev, readWindowState());
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Screen lock: after the idle timeout, and at once when Windows locks or goes to sleep.
    container.idleLock.watch(mainWindow.webContents);
    container.idleLock.start();
    powerMonitor.on('lock-screen', () => void container.idleLock.lockAll());
    powerMonitor.on('suspend', () => void container.idleLock.lockAll());

    app.on('before-quit', () => {
        container.idleLock.stop();
        container.scheduler.stop();
        container.clipboard.clearIfOurs();
        void container.database.close();
    });

    // Development only: drive the running window from a script (automated UI checks).
    if (isDev && process.env.PMA_DEV_SCRIPT) void runDevScript(container, mainWindow);
}

async function smokeTestSummary(container: Container, migrations: MigrationReport) {
    const db = await container.database.get();
    return {
        userData: AppPaths.userData,
        migrations,
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
}

/** Data no key here can open was moved aside (see app/dataSet): say where, and what to do. */
async function explainSetAside(folder: string): Promise<void> {
    if (smokeTest) return;
    await dialog.showMessageBox({
        type: 'warning',
        title: 'PManager',
        message: 'Попередні дані не вдалося відкрити',
        detail:
            'Дані на цьому компʼютері зашифровані ключем, якого тут більше немає (наприклад, ' +
            'змінився користувач Windows або файл бази скопіювали з іншого компʼютера).\n\n' +
            `Нічого не видалено: дані перенесено в теку\n${folder}\n\n` +
            'Програма відкриється з порожньою базою. Щоб повернути дані, відновіть резервну ' +
            'копію (файл .pmb). Переносити дані між компʼютерами можна тільки резервною копією.',
        buttons: ['Зрозуміло'],
        noLink: true,
    });
}

async function runDevScript(container: unknown, window: BrowserWindow): Promise<void> {
    await new Promise<void>((resolve) =>
        window.webContents.once('did-finish-load', () => resolve()),
    );
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
    if (error instanceof AppError && error.code === 'CORRUPTED') {
        dialog.showErrorBox(
            'База даних пошкоджена',
            'Файл бази даних на цьому компʼютері пошкоджено, тому програма не запускається, ' +
                'щоб не зіпсувати дані ще більше.\n\n' +
                'Відновіть останню резервну копію: запустіть програму на іншому компʼютері або ' +
                `скопіюйте копію з теки:\n${AppPaths.backupsRoot}\n\nЖурнал: ${logFile}`,
        );
        app.exit(1);
        return;
    }
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
