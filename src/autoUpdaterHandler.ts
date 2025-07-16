import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { dialog, BrowserWindow, app } from 'electron';
import path from 'path';
import fs from 'fs';

let updaterInitialized = false;
let updateDownloaded = false;
let isQuitting = false; // собственный флаг выхода

export function setupAutoUpdater() {
    if (updaterInitialized) {
        log.info('⚠️ AutoUpdater already initialized, skipping...');
        return;
    }
    updaterInitialized = true;

    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    log.info('✅ AutoUpdater initialized');

    // --- Проверяем, где запущен app (важно для macOS) ---
    if (process.platform === 'darwin') {
        const appPath = path.resolve(process.execPath, '..', '..', '..');
        const inApplications = appPath.startsWith('/Applications');

        if (!inApplications) {
            log.warn('⚠️ macOS app is NOT in /Applications. Auto-update may fail.');
            dialog.showMessageBoxSync({
                type: 'warning',
                title: 'Auto-update may not work',
                message:
                    'To enable auto-updates on macOS, move the app to the /Applications folder.',
            });
        }
    }

    // 🔍 Проверка
    autoUpdater.on('checking-for-update', () => {
        log.info('🔍 Checking for updates...');
    });

    // ⬇️ Найдено обновление
    autoUpdater.on('update-available', (info) => {
        log.info(`⬇️ Update available: ${info.version}`);
        dialog.showMessageBox({
            type: 'info',
            title: 'Update Available',
            message: `A new version (${info.version}) is available and is being downloaded...`,
        });
    });

    // ✅ Нет обновлений
    autoUpdater.on('update-not-available', () => {
        log.info('✅ No updates available.');
    });

    // ❌ Ошибка
    autoUpdater.on('error', (err) => {
        log.error('❌ Error in auto-updater:', err?.stack || err?.message || err);
    });

    // 📦 Прогресс загрузки
    autoUpdater.on('download-progress', (progress) => {
        log.info(`📦 Downloading update... ${progress.percent.toFixed(2)}%`);
    });

    // ✅ Когда обновление загружено
    autoUpdater.on('update-downloaded', (info) => {
        log.info(`✅ Update downloaded: version ${info.version}`);
        updateDownloaded = true;

        dialog
            .showMessageBox({
                type: 'info',
                title: 'Update Ready',
                message: `A new version (${info.version}) has been downloaded. Restart now to install?`,
                buttons: ['Restart Now', 'Later'],
                defaultId: 0,
                cancelId: 1,
            })
            .then((result) => {
                if (result.response === 0) {
                    log.info('✅ User chose Restart Now');
                    doQuitAndInstall();
                } else {
                    log.info('⏸️ User chose Later');
                }
            });
    });

    // ⚡ Если пользователь сам закроет приложение → применяем обновление
    app.on('before-quit', (event) => {
        if (updateDownloaded && !isQuitting) {
            log.info('⚡ Update downloaded, installing on quit...');
            event.preventDefault();
            doQuitAndInstall();
        }
    });
}

function doQuitAndInstall() {
    isQuitting = true;

    // Закрываем все окна
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
        log.info(`Destroying window ${win.id}`);
        win.destroy();
    });

    app.removeAllListeners('window-all-closed');

    setTimeout(() => {
        if (process.platform === 'darwin') {
            log.info('🍏 macOS → quitAndInstall without restart');
            try {
                autoUpdater.quitAndInstall(false, false);
            } catch (err) {
                log.error('quitAndInstall error on macOS:', err);
            }

            // 🍏 macOS FIX: если процесс не выгрузился → жёстко убиваем
            setTimeout(() => {
                if (app.isReady()) {
                    log.warn('⚠️ macOS still running → forcing app.exit(0)');
                    app.exit(0);
                }
            }, 1500);
        } else {
            log.info('🚀 Windows/Linux → quitAndInstall with restart');
            try {
                autoUpdater.quitAndInstall(false, true);
            } catch (err) {
                log.error('quitAndInstall error on Win/Linux:', err);
                app.quit();
            }
        }
    }, 500);
}

export function autoCheckOnStartup() {
    autoUpdater.checkForUpdatesAndNotify();
}
