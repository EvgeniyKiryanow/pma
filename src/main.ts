import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import started from 'electron-squirrel-startup';
import { registerDbHandlers } from './ipc/dbHandlers';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { initializeDb } from './database/db';

if (started) {
    app.quit();
}

// Configure electron-log
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.logger.info('App starting…');

// Handle update events
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
    log.error('Error in auto-updater:', err == null ? "unknown" : (err.stack || err).toString());
});
autoUpdater.on('download-progress', (progressObj) => {
    log.info(`Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent.toFixed(2)}%`);
});
autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded; will install now');
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded, application will quit and install now.',
    }).then(() => {
        autoUpdater.quitAndInstall();
    });
});

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }

    mainWindow.webContents.openDevTools();
};

app.whenReady().then(async () => {
    registerDbHandlers();
    await initializeDb(); 
    createWindow();

    // Check for updates only after app is ready and window created
    autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
