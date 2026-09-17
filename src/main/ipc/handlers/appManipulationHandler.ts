import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

import { createLogger } from '../../core/logger';
import { access, handle } from '../secureHandle';

const logger = createLogger('app');

/** Window controls (custom title bar) and version info. */
export function registerAppHandlers() {
    ipcMain.on('app:close', () => {
        if (process.platform === 'darwin') app.exit(0);
        else app.quit();
    });

    ipcMain.on('app:toggle-fullscreen', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        win?.setFullScreen(!win.isFullScreen());
    });

    handle('hide-app', access.public, (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (process.platform === 'darwin') app.hide();
        else win?.minimize();
    });

    handle('get-app-version', access.public, () => app.getVersion());

    handle('check-for-updates', access.authenticated, async () => {
        try {
            const result = await autoUpdater.checkForUpdates();
            return { status: 'ok', info: result?.updateInfo };
        } catch (err: any) {
            logger.error('Manual update check failed', err);
            return { status: 'error', message: err?.message || 'Unknown update error' };
        }
    });
}
