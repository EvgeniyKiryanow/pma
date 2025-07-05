import { app, BrowserWindow, dialog, screen } from 'electron';
import path from 'path';
import started from 'electron-squirrel-startup';
import { registerDbHandlers } from './ipc';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { initializeDb } from './database/db';
import { upgradeDbSchema } from './database/migrations';

const iconPath = path.join(
    __dirname,
    '..',
    'build',
    'icons',
    process.platform === 'win32' ? 'appIcon.ico' : 'appIcon.icns',
);

const isDev = !app.isPackaged;

// Prevent squirrel auto-launch on Windows
if (started) {
    app.quit();
}

// Setup logging for updater
log.transports.file.level = 'info';
autoUpdater.logger = log;
log.info('🟢 App starting…');

// ===== AUTO-UPDATER EVENTS =====
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

autoUpdater.on('update-downloaded', () => {
    log.info('✅ Update downloaded');

    dialog
        .showMessageBox({
            type: 'info',
            title: 'Update Ready for downloading',
            message: 'A new update has been downloaded. Restart the app now to install it?',
            buttons: ['Restart Now', 'Later'],
            defaultId: 0,
            cancelId: 1,
        })
        .then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
});

// ===== CREATE MAIN WINDOW =====
const createWindow = () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const mainWindow = new BrowserWindow({
        width: Math.floor(width * 0.9),
        height: Math.floor(height * 0.9),
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
        mainWindow.loadFile(indexPath);
    }
};

// ===== HANDLE APP STARTUP =====
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

app.whenReady()
    .then(async () => {
        registerDbHandlers();
        await initializeDb();
        await upgradeDbSchema();
        createWindow();

        // Trigger update check in production only
        if (!isDev) {
            autoUpdater.checkForUpdatesAndNotify();
        }
    })
    .catch((err) => {
        console.error('❌ App failed to launch:', err);
    });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
