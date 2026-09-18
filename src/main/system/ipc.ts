import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

import { APP_CHANNELS, APP_EVENTS } from '../../shared/ipc/channels';
import type { UpdateCheckResult } from '../../shared/types/system';
import type { Logger } from '../core/logger';
import { access, handle, listen } from '../ipc/secureHandle';

/** Window controls of the custom title bar, version info and the manual update check. */
export function registerSystemIpc(logger: Logger): void {
    listen(APP_EVENTS.close, () => {
        if (process.platform === 'darwin') app.exit(0);
        else app.quit();
    });

    listen(APP_EVENTS.toggleFullScreen, (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        win?.setFullScreen(!win.isFullScreen());
    });

    handle(APP_CHANNELS.hide, access.public, (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (process.platform === 'darwin') app.hide();
        else win?.minimize();
    });

    handle(APP_CHANNELS.getVersion, access.public, () => app.getVersion());

    handle(
        APP_CHANNELS.checkForUpdates,
        access.authenticated,
        async (): Promise<UpdateCheckResult> => {
            try {
                const result = await autoUpdater.checkForUpdates();
                return { status: 'ok', info: result?.updateInfo };
            } catch (err: any) {
                logger.error('Manual update check failed', err);
                return { status: 'error', message: err?.message || 'Unknown update error' };
            }
        },
    );
}
