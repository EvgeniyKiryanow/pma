import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import started from 'electron-squirrel-startup';
import { registerDbHandlers } from './ipc';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { initializeDb } from './database/db';
import { upgradeDbSchema } from './database/migrations';
const iconPath = path.join(__dirname, '..', 'build', 'icons', process.platform === 'win32' ? 'appIcon.ico' : 'appIcon.icns');

const isDev = !app.isPackaged;

if (started) {
    app.quit();
}

// Configure electron-log
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.logger.info('App starting…');

// Auto updater events
autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
});
autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `Version ${info.version} is available and will be downloaded in background.`,
    });
});
autoUpdater.on('update-not-available', () => {
    log.info('No updates available.');
});
autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err == null ? 'unknown' : (err.stack || err).toString());
});
autoUpdater.on('download-progress', (progressObj) => {
    log.info(
        `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent.toFixed(2)}%`,
    );
});
autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded; will install now');
    dialog
        .showMessageBox({
            type: 'info',
            title: 'Update Ready',
            message: 'Update downloaded, application will quit and install now.',
        })
        .then(() => {
            autoUpdater.quitAndInstall();
        });
});

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: iconPath,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        const indexPath = path.join(app.getAppPath(), 'renderer_dist/index.html');
        console.log('Loading production index.html from:', indexPath);
        mainWindow.loadFile(indexPath);
    }
};

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

app.whenReady()
    .then(async () => {
        registerDbHandlers();
        await initializeDb();
        await upgradeDbSchema();
        createWindow();
        autoUpdater.checkForUpdatesAndNotify();
    })
    .catch((err) => {
        console.error('App failed to launch:', err);
    });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
