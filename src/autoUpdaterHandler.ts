import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { dialog, BrowserWindow, app } from 'electron';

let updaterInitialized = false;
let updateDownloaded = false;

export function setupAutoUpdater() {
    if (updaterInitialized) {
        log.info('⚠️ AutoUpdater already initialized, skipping...');
        return;
    }
    updaterInitialized = true;

    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    log.info('✅ AutoUpdater initialized');

    // 🔍 Checking
    autoUpdater.on('checking-for-update', () => {
        log.info('🔍 Checking for updates...');
    });

    // ⬇️ Available
    autoUpdater.on('update-available', (info) => {
        log.info(`⬇️ Update available: ${info.version}`);
        dialog.showMessageBox({
            type: 'info',
            title: 'Update Available',
            message: `A new version (${info.version}) is available and is being downloaded...`,
        });
    });

    // ✅ No updates
    autoUpdater.on('update-not-available', () => {
        log.info('✅ No updates available.');
    });

    // ❌ Errors
    autoUpdater.on('error', (err) => {
        log.error('❌ Error in auto-updater:', err?.stack || err?.message || err);
    });

    // 📦 Progress
    autoUpdater.on('download-progress', (progress) => {
        log.info(`📦 Downloading update... ${progress.percent.toFixed(2)}%`);
    });

    // ✅ When downloaded
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

                    // Убираем обработчик window-all-closed, чтобы не блокировал quit
                    app.removeAllListeners('window-all-closed');

                    // Немного времени на закрытие всех окон
                    setTimeout(() => {
                        setImmediate(() => {
                            try {
                                if (process.platform === 'darwin') {
                                    // macOS не закрывает app после destroy → принудительно quit
                                    log.info(
                                        '🍏 macOS detected → forcing app.quit() before quitAndInstall',
                                    );
                                    app.quit();
                                }

                                log.info('🚀 Calling autoUpdater.quitAndInstall...');
                                autoUpdater.quitAndInstall(false, true);
                                log.info('✅ quitAndInstall executed');
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

                if (process.platform === 'darwin') {
                    log.info('🍏 macOS → forcing quitAndInstall on before-quit');
                    setTimeout(() => autoUpdater.quitAndInstall(false, true), 300);
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
