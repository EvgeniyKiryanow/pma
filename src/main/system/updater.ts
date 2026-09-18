import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

import type { UpdateCheckResult } from '../../shared/types/system';
import type { Logger } from '../core/logger';

const RESTART_DELAY_MS = 1500;

/**
 * Updates from the project's GitHub releases, only when the user asks: the app works offline
 * and never contacts the network by itself.
 *
 * macOS replaces the app in place only when the new build is signed with the same Developer
 * ID; unsigned builds are downloaded from the releases page by hand.
 */
export class AppUpdater {
    private configured = false;

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
        const result = await autoUpdater.checkForUpdates();
        const version = result?.updateInfo.version ?? app.getVersion();
        if (!result?.isUpdateAvailable) return { status: 'current', version };
        return { status: 'available', version, canInstall: this.canInstall };
    }

    /** Downloads the update found by `check()`, then restarts into the installer. */
    async install(): Promise<void> {
        if (!this.canInstall) throw new Error('Update cannot be installed automatically');
        this.configure();
        await autoUpdater.checkForUpdates();
        await autoUpdater.downloadUpdate();
        this.logger.info('Update downloaded, restarting to install');
        // After the reply (and its audit entry) went out: silent install on Windows, then
        // start the new version.
        setTimeout(() => autoUpdater.quitAndInstall(true, true), RESTART_DELAY_MS);
    }
}
