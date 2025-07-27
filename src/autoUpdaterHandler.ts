import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { dialog, BrowserWindow, app } from 'electron';
import { exec } from 'child_process';
import path from 'path';

let updaterInitialized = false;
let updateDownloaded = false;
let isQuitting = false;

export function setupAutoUpdater() {
    if (updaterInitialized) return;
    updaterInitialized = true;

    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    log.info('✅ AutoUpdater initialized');

    autoUpdater.on('checking-for-update', () => {
        log.info('🔍 Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
        log.info(`⬇️ Update available: ${info.version}`);
        dialog.showMessageBox({
            type: 'info',
            title: 'Update Available',
            message: `A new version (${info.version}) is available and downloading...`,
        });
    });

    autoUpdater.on('update-not-available', () => {
        log.info('✅ No updates available.');
    });

    autoUpdater.on('error', (err) => {
        const message = err?.message || String(err);
        log.error('❌ Помилка автооновлення:', err?.stack || message);

        let extraHint = '';

        // Якщо Windows → показуємо підказку про Smart App Control
        if (process.platform === 'win32') {
            extraHint =
                '\n\n❗ Якщо ви використовуєте Windows 11, оновлення може бути заблоковане функцією Smart App Control.\n' +
                'Щоб вимкнути його:\n' +
                '1️⃣ Відкрийте **Параметри → Конфіденційність та безпека**.\n' +
                '2️⃣ Перейдіть у **Безпека Windows → Керування додатками/браузером**.\n' +
                '3️⃣ Знайдіть **Smart App Control** та вимкніть.\n' +
                '4️⃣ Перезавантажте компʼютер і повторіть спробу оновлення.';
        }

        dialog.showMessageBox({
            type: 'error',
            title: 'Помилка автооновлення',
            message: `Не вдалося встановити оновлення:\n${message}${extraHint}`,
        });
    });

    // ✅ Show progress in dock/taskbar
    autoUpdater.on('download-progress', (progress) => {
        const percent = progress.percent.toFixed(2);
        const transferred = (progress.transferred / 1024 / 1024).toFixed(2);
        const total = (progress.total / 1024 / 1024).toFixed(2);

        log.info(`📦 Downloading update... ${percent}% (${transferred}MB / ${total}MB)`);

        const win = BrowserWindow.getFocusedWindow();
        if (win) {
            win.setProgressBar(progress.percent / 100);
        }

        if (process.platform === 'darwin') {
            app.dock.setBadge(`${Math.round(progress.percent)}%`);
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info(`✅ Update downloaded: version ${info.version}`);
        updateDownloaded = true;

        const win = BrowserWindow.getFocusedWindow();
        if (win) win.setProgressBar(-1);
        if (process.platform === 'darwin') app.dock.setBadge('');

        dialog
            .showMessageBox({
                type: 'info',
                title: 'Update Ready',
                message: `A new version (${info.version}) has been downloaded.\nRestart now to install?`,
                buttons: ['Restart Now', 'Later'],
                defaultId: 0,
                cancelId: 1,
            })
            .then((result) => {
                if (result.response === 0) {
                    log.info('✅ User chose Restart Now');
                    quitAndInstallProperly();
                } else {
                    log.info('⏸️ User chose Later');
                }
            });
    });

    app.on('before-quit', (event) => {
        if (updateDownloaded && !isQuitting) {
            log.info('⚡ Update downloaded, installing on quit...');
            event.preventDefault();
            quitAndInstallProperly();
        }
    });
}

// ✅ Новый метод: жёсткое завершение процесса перед установкой
function forceKillOwnProcessAndInstall() {
    const exeName = path.basename(process.execPath);

    log.info(`🔪 Force killing process: ${exeName}`);
    exec(`taskkill /F /IM ${exeName}`, (err) => {
        if (err) {
            log.error('❌ Failed to taskkill', err);
        }
        log.info('✅ Process killed, running quitAndInstall');
        autoUpdater.quitAndInstall(false, true);
    });
}

function quitAndInstallProperly() {
    isQuitting = true;

    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => win.destroy());
    app.removeAllListeners('window-all-closed');

    setTimeout(() => {
        try {
            if (process.platform === 'darwin') {
                log.info('🍏 macOS → quitAndInstall WITHOUT restart (DMG)');
                autoUpdater.quitAndInstall(false, false);

                dialog.showMessageBoxSync({
                    type: 'info',
                    title: 'Update Installed',
                    message: `The update was installed successfully.\nPlease reopen the app from /Applications.`,
                });

                setTimeout(() => {
                    if (app.isReady()) {
                        log.warn('⚠️ macOS still running → forcing app.exit(0)');
                        app.exit(0);
                    }
                }, 1500);
            } else if (process.platform === 'win32') {
                log.info('🪟 Windows → force kill before quitAndInstall');
                forceKillOwnProcessAndInstall();
            } else {
                log.info('🐧 Linux → quitAndInstall WITH restart');
                autoUpdater.quitAndInstall(false, true);
            }
        } catch (err) {
            log.error('quitAndInstall failed:', err);
            app.quit();
        }
    }, 500);
}

export function autoCheckOnStartup() {
    autoUpdater.checkForUpdatesAndNotify();
}
