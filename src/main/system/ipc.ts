import { app, BrowserWindow } from 'electron';
import fsp from 'fs/promises';
import path from 'path';

import { APP_CHANNELS, APP_EVENTS } from '../../shared/ipc/channels';
import { AppError } from '../../shared/ipc/result';
import { chooseSavePath } from '../core/dialogs';
import { move } from '../core/fsUtils';
import type { Logger } from '../core/logger';
import { access, handle, handleResult, listen } from '../ipc/secureHandle';
import { aboutInfo, supportLog } from './about';
import type { AppUpdater } from './updater';

/** Window controls of the custom title bar, version info and updates on request. */
export function registerSystemIpc(
    logger: Logger,
    updater: AppUpdater,
    hasAccounts: () => Promise<boolean>,
): void {
    // Updates: for a signed-in user, and on an empty installation (first run, or right after
    // everything was destroyed) — the safe way to update is backup → destroy → update →
    // restore, and there is no account then. Checked on every call: once the first account
    // exists, an anonymous window is refused again.
    const canUpdate = access.custom(
        async (session) =>
            (session !== null && !session.mustChangePassword) || !(await hasAccounts()),
    );

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

    handleResult(APP_CHANNELS.about, access.authenticated, () => aboutInfo());

    handleResult(
        APP_CHANNELS.saveLog,
        access.authenticated,
        async (event) => {
            const day = new Date().toISOString().slice(0, 10);
            const target = await chooseSavePath(event.sender, {
                title: 'Зберегти журнал програми',
                defaultPath: `pmanager-zhurnal_${day}.txt`,
                filters: [{ name: 'Текст', extensions: ['txt'] }],
            });
            if (!target) throw new AppError('CANCELED');
            // Written next to the target and renamed: never half a file on the flash drive.
            const partial = `${target}.partial`;
            await fsp.writeFile(partial, await supportLog(), 'utf8');
            await move(partial, target);
            return { fileName: path.basename(target) };
        },
        { audit: 'system.save-log' },
    );

    handleResult(APP_CHANNELS.checkForUpdates, canUpdate, () =>
        updateStep(logger, 'check', () => updater.check()),
    );

    handleResult(
        APP_CHANNELS.installUpdate,
        canUpdate,
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
