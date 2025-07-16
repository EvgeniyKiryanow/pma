import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { dialog, BrowserWindow, ipcMain } from 'electron';

let updaterInitialized = false; // ✅ guard

export function setupAutoUpdater() {
    if (updaterInitialized) {
        log.info('⚠️ AutoUpdater already initialized, skipping...');
        return;
    }
    updaterInitialized = true; // ✅ mark as initialized

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
            message: `A new version (${info.version}) is available and is being downloaded.`,
        });
    });

    autoUpdater.on('update-not-available', () => {
        log.info('✅ No updates available.');
    });

    autoUpdater.on('error', (err) => {
        log.error('❌ Error in auto-updater:', err?.stack || err?.message || err);
    });

    autoUpdater.on('download-progress', (progress) => {
        log.info(`📦 Downloading update... ${progress.percent.toFixed(2)}%`);
    });

    // autoUpdater.on('update-downloaded', () => {
    //     log.info('✅ Update downloaded');

    //     dialog
    //         .showMessageBox({
    //             type: 'info',
    //             title: 'Update Ready',
    //             message: 'A new update has been downloaded. Restart now to install?',
    //             buttons: ['Restart Now', 'Later'],
    //             defaultId: 0,
    //             cancelId: 1,
    //         })
    //         .then((result) => {
    //             if (result.response === 0) {
    //                 log.info('Restarting and installing update...');

    //                 // Close all windows
    //                 const allWindows = BrowserWindow.getAllWindows();
    //                 allWindows.forEach((win) => win.destroy());

    //                 // Give Electron a tiny delay before quitting
    //                 setImmediate(() => {
    //                     autoUpdater.quitAndInstall(false, true);
    //                 });
    //             }
    //         });
    // });
    autoUpdater.on('update-downloaded', (info) => {
        log.info(`✅ Update downloaded: version ${info.version}`);

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
                    log.info('User chose Restart Now');

                    // Close all windows
                    const windows = BrowserWindow.getAllWindows();
                    windows.forEach((win) => {
                        log.info(`Destroying window ${win.id}`);
                        win.destroy();
                    });

                    // Give a slight delay so dialog/windows fully close
                    setTimeout(() => {
                        try {
                            log.info('Calling quitAndInstall...');
                            autoUpdater.quitAndInstall(false, true);
                            log.info('quitAndInstall executed');
                        } catch (error) {
                            log.error('quitAndInstall error:', error);
                        }
                    }, 500);
                } else {
                    log.info('User chose Later');
                }
            });
    });

    // Optional: clean auth token before quit
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
        win.webContents.send('clear-auth-token');
    });
}

export function autoCheckOnStartup() {
    autoUpdater.checkForUpdatesAndNotify();
}
