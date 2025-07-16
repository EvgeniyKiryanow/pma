import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { dialog, BrowserWindow, ipcMain, app } from 'electron';

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

                    // 1️⃣ Закрываем все окна
                    const windows = BrowserWindow.getAllWindows();
                    windows.forEach((win) => {
                        log.info(`Destroying window ${win.id}`);
                        win.destroy();
                    });

                    // 2️⃣ Отключаем window-all-closed чтобы не мешал
                    app.removeAllListeners('window-all-closed');

                    // 3️⃣ Небольшая задержка
                    setTimeout(() => {
                        setImmediate(() => {
                            try {
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

    // ⚡ Если пользователь сам закроет приложение, применяем обновление
    app.on('before-quit', (event) => {
        if (updateDownloaded) {
            log.info('⚡ Update downloaded, installing on quit...');
            try {
                event.preventDefault(); // предотвращаем обычный quit
                autoUpdater.quitAndInstall(false, true); // применяем обновление
            } catch (err) {
                log.error('quitAndInstall on before-quit failed:', err);
                app.quit(); // fallback
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
