import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import { AppError } from '../../shared/ipc/result';
import type { Logger } from '../core/logger';

export type UninstallerOptions = {
    /** Installed program (not a development run). */
    packaged: () => boolean;
    /** Folder of the program's executable. */
    programDir: () => string;
    /** Leaves the program without asking anything. */
    exit: () => void;
    platform?: NodeJS.Platform;
    /** Starts a detached process (tests pass a fake). */
    launch?: (file: string, args: string[]) => void;
};

/**
 * The Windows uninstaller the installer put next to the program ("Uninstall PManager.exe").
 * Started silently with `--delete-app-data` it closes the program if it still runs, removes
 * it with its shortcuts and deletes the data folder. Before that the data is destroyed by the
 * app itself (overwritten, see BackupService.resetAll) — the uninstaller only deletes.
 * Not available in development runs or on other systems.
 */
export class Uninstaller {
    constructor(
        private readonly logger: Logger,
        private readonly options: UninstallerOptions,
    ) {}

    private find(): string | null {
        const platform = this.options.platform ?? process.platform;
        if (platform !== 'win32' || !this.options.packaged()) return null;
        const dir = this.options.programDir();
        if (!fs.existsSync(dir)) return null;
        const name = fs.readdirSync(dir).find((file) => /^Uninstall .+\.exe$/i.test(file));
        return name ? path.join(dir, name) : null;
    }

    available(): boolean {
        return this.find() !== null;
    }

    /** Starts the uninstaller and closes the program shortly after (the reply goes out first). */
    start(): void {
        const file = this.find();
        if (!file) throw new AppError('VALIDATION', 'Програму встановлено не інсталятором');
        const launch =
            this.options.launch ??
            ((command: string, args: string[]) =>
                spawn(command, args, {
                    detached: true,
                    stdio: 'ignore',
                    windowsHide: true,
                }).unref());
        launch(file, ['/S', '--delete-app-data']);
        this.logger.warn('Uninstaller started, the program closes');
        setTimeout(() => this.options.exit(), 800).unref?.();
    }
}
