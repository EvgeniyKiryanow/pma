import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { dialog, BrowserWindow, app } from 'electron';

let updaterInitialized = false;
let updateDownloaded = false;
let isQuitting = false; // <--- собственный флаг

export function setupAutoUpdater() {
    if (updaterInitialized) {
        log.info('⚠️ AutoUpdater already initialized, skipping...');
        return;
    }
    updaterInitialized = true;

    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    log.info('✅ AutoUpdater initialized');

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

                    const windows = BrowserWindow.getAllWindows();
                    windows.forEach((win) => {
                        log.info(`Destroying window ${win.id}`);
                        win.destroy();
                    });

                    app.removeAllListeners('window-all-closed');

                    // Немного подождём, чтобы все окна точно уничтожились
                    setTimeout(() => {
                        setImmediate(() => {
                            try {
                                isQuitting = true; // <-- помечаем, что процесс уходит
                                log.info('🚀 Calling autoUpdater.quitAndInstall...');
                                autoUpdater.quitAndInstall(false, true);

                                if (process.platform === 'darwin') {
                                    // 🍏 macOS FIX: если процесс не выгрузился → убиваем
                                    setTimeout(() => {
                                        if (isQuitting === true && app.isReady()) {
                                            log.warn(
                                                '⚠️ macOS still running → forcing app.exit(0)',
                                            );
                                            app.exit(0);
                                        }
                                    }, 1500);
                                }
                            } catch (err) {
                                log.error('❌ quitAndInstall error:', err);
                                log.info('Fallback → app.quit()');
                                app.quit();
                            }
                        });
                    }, 500);
                } else {
                    log.info('⏸️ User chose Later');
                }
            });
    });

    // ⚡ Если пользователь сам закроет приложение → применяем обновление
    app.on('before-quit', (event) => {
        if (updateDownloaded) {
            log.info('⚡ Update downloaded, installing on quit...');
            try {
                event.preventDefault();
                isQuitting = true;

                if (process.platform === 'darwin') {
                    log.info('🍏 macOS → delaying quitAndInstall on before-quit');
                    setTimeout(() => autoUpdater.quitAndInstall(false, true), 300);

                    // Принудительный выход, если Electron зависнет
                    setTimeout(() => {
                        if (isQuitting) {
                            log.warn('⚠️ macOS fallback → app.exit(0)');
                            app.exit(0);
                        }
                    }, 1500);
                } else {
                    autoUpdater.quitAndInstall(false, true);
                }
            } catch (err) {
                log.error('quitAndInstall on before-quit failed:', err);
                app.quit();
            }
        }
    });

    // Очистка токенов перед quit (опционально)
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
        win.webContents.send('clear-auth-token');
    });
}

export function autoCheckOnStartup() {
    autoUpdater.checkForUpdatesAndNotify();
}
