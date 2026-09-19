import { app } from 'electron';
import { autoUpdater, CancellationToken, type ProgressInfo } from 'electron-updater';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';

import { AppError } from '../../shared/ipc/result';
import type { UpdateCheckResult, UpdateProgress } from '../../shared/types/system';
import type { Logger } from '../core/logger';

const RESTART_DELAY_MS = 1500;
/** No answer from the releases page within this time: no connection. */
const CHECK_TIMEOUT_MS = 30_000;
/** A download that has not moved for this long is broken off (lost connection). */
const STALL_TIMEOUT_MS = 60_000;
/** Folder of the downloaded installer (`updaterCacheDirName` of app-update.yml). */
const CACHE_DIR_NAME = 'p-manager-updater';

/** Rejects with UPDATE_FAILED (reason `offline`) when `work` does not finish in time. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
            () => reject(new AppError('UPDATE_FAILED', 'No answer', { reason: 'offline' })),
            ms,
        );
    });
    return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Updates from the project's GitHub releases, only when the user asks: the app works offline
 * and never contacts the network by itself.
 *
 * Nothing here can hang the window: the check gives up after 30 seconds, a download that
 * stops moving is broken off, and the person can cancel it at any moment.
 *
 * macOS replaces the app in place only when the new build is signed with the same Developer
 * ID; unsigned builds are downloaded from the releases page by hand.
 */
export class AppUpdater {
    private configured = false;
    private download: CancellationToken | null = null;

    constructor(private readonly logger: Logger) {}

    private get canInstall(): boolean {
        return app.isPackaged && process.platform !== 'darwin';
    }

    private configure(): void {
        if (this.configured) return;
        this.configured = true;
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = false;
        autoUpdater.disableWebInstaller = true;
        autoUpdater.logger = {
            info: (message: unknown) => this.logger.info(`updater: ${String(message)}`),
            warn: (message: unknown) => this.logger.warn(`updater: ${String(message)}`),
            error: (message: unknown) => this.logger.error('updater', message),
            debug: () => undefined,
        };
    }

    async check(): Promise<UpdateCheckResult> {
        if (!app.isPackaged) return { status: 'current', version: app.getVersion() };
        this.configure();
        const result = await withTimeout(autoUpdater.checkForUpdates(), CHECK_TIMEOUT_MS);
        const version = result?.updateInfo.version ?? app.getVersion();
        if (!result?.isUpdateAvailable) return { status: 'current', version };
        return { status: 'available', version, canInstall: this.canInstall };
    }

    /**
     * Downloads the update, reporting progress, then restarts into the installer.
     * Throws CANCELED when `cancel()` was called, UPDATE_FAILED with the reason `stalled` when
     * the download stopped moving or `offline` when the releases page does not answer.
     */
    async install(onProgress: (progress: UpdateProgress) => void): Promise<void> {
        if (!this.canInstall) throw new Error('Update cannot be installed automatically');
        if (this.download) throw new AppError('CONFLICT', 'An update is already downloading');
        this.configure();
        const token = new CancellationToken();
        this.download = token;

        let stalled = false;
        let watchdog: NodeJS.Timeout | undefined;
        const armWatchdog = () => {
            clearTimeout(watchdog);
            watchdog = setTimeout(() => {
                stalled = true;
                this.logger.warn('Update download stalled, canceling');
                token.cancel();
            }, STALL_TIMEOUT_MS);
        };
        const progress = (info: ProgressInfo) => {
            armWatchdog();
            onProgress({
                percent: Math.max(0, Math.min(100, Math.round(info.percent ?? 0))),
                transferred: info.transferred ?? 0,
                total: info.total ?? 0,
                bytesPerSecond: info.bytesPerSecond ?? 0,
            });
        };

        autoUpdater.on('download-progress', progress);
        try {
            const found = await withTimeout(autoUpdater.checkForUpdates(), CHECK_TIMEOUT_MS);
            if (!found?.isUpdateAvailable) throw new AppError('NOT_FOUND', 'No update available');
            if (token.cancelled) throw new AppError('CANCELED');
            onProgress({ percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 });
            armWatchdog();
            await autoUpdater.downloadUpdate(token);
        } catch (err) {
            if (stalled)
                throw new AppError('UPDATE_FAILED', 'Download stalled', { reason: 'stalled' });
            if (token.cancelled) throw new AppError('CANCELED');
            throw err;
        } finally {
            clearTimeout(watchdog);
            autoUpdater.removeListener('download-progress', progress);
            this.download = null;
        }
        this.logger.info('Update downloaded, restarting to install');
        // After the reply (and its audit entry) went out: silent install on Windows, then
        // start the new version.
        setTimeout(() => autoUpdater.quitAndInstall(true, true), RESTART_DELAY_MS);
    }

    /** Stops a running download; `install()` then fails with CANCELED. */
    cancel(): boolean {
        if (!this.download) return false;
        this.logger.info('Update download canceled by the user');
        this.download.cancel();
        return true;
    }

    /**
     * The installer an update left in %LOCALAPPDATA% (it is kept there after installing).
     * Removed at start: nothing of PManager stays outside its own folders.
     */
    static async removeDownloadedInstaller(logger: Logger): Promise<void> {
        if (!app.isPackaged || process.platform !== 'win32') return;
        const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        const dir = path.join(base, CACHE_DIR_NAME);
        try {
            await fsp.rm(dir, { recursive: true, force: true, maxRetries: 3 });
        } catch (err) {
            // The installer may still be finishing; the next start tries again.
            logger.warn('Downloaded update could not be removed yet', err);
        }
    }
}
