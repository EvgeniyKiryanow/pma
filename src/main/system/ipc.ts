import { app, BrowserWindow } from 'electron';

import { APP_CHANNELS, APP_EVENTS } from '../../shared/ipc/channels';
import { AppError } from '../../shared/ipc/result';
import type { Logger } from '../core/logger';
import { access, handle, handleResult, listen } from '../ipc/secureHandle';
import type { AppUpdater } from './updater';

/** Window controls of the custom title bar, version info and updates on request. */
export function registerSystemIpc(logger: Logger, updater: AppUpdater): void {
    listen(APP_EVENTS.close, () => {
        if (process.platform === 'darwin') app.exit(0);
        else app.quit();
    });

    listen(APP_EVENTS.toggleMaximize, (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return;
        if (win.isFullScreen()) win.setFullScreen(false);
        else if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    });

    handle(APP_CHANNELS.isMaximized, access.public, (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        return Boolean(win && (win.isMaximized() || win.isFullScreen()));
    });

    handle(APP_CHANNELS.hide, access.public, (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (process.platform === 'darwin') app.hide();
        else win?.minimize();
    });

    handle(APP_CHANNELS.getVersion, access.public, () => app.getVersion());

    handleResult(APP_CHANNELS.checkForUpdates, access.authenticated, () =>
        updateStep(logger, 'check', () => updater.check()),
    );

    handleResult(
        APP_CHANNELS.installUpdate,
        access.authenticated,
        () => updateStep(logger, 'install', () => updater.install()),
        { audit: 'system.update' },
    );
}

/** Network and download failures reach the user as one translated message. */
async function updateStep<T>(logger: Logger, step: string, work: () => Promise<T>): Promise<T> {
    try {
        return await work();
    } catch (err) {
        logger.error(`Update ${step} failed`, err);
        throw new AppError('UPDATE_FAILED');
    }
}
