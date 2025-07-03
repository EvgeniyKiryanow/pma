import { app, BrowserWindow } from 'electron';
import path from 'path';
import started from 'electron-squirrel-startup';
import { registerDbHandlers } from './ipc/dbHandlers';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

if (started) {
    app.quit();
}
// Configure electron-log
log.transports.file.level = 'info';

// Pipe electron-updater logs into electron-log
autoUpdater.logger = log;
autoUpdater.logger?.info('App starting…');

// In your app ready handler:
app.whenReady().then(() => {
    autoUpdater.checkForUpdatesAndNotify();
});

app.whenReady().then(() => {
    autoUpdater.checkForUpdatesAndNotify();
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
        mainWindow.loadFile(
            path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
        );
    }

    mainWindow.webContents.openDevTools();
};

app.whenReady().then(async () => {
    registerDbHandlers();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
