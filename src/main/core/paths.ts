import { app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Every filesystem location the app uses. Nothing else in the main process should
 * build paths from `app.getPath`, `__dirname` or `process.cwd()` directly.
 */
export const AppPaths = {
    get userData(): string {
        return app.getPath('userData');
    },

    /** Live SQLite database. The file name is kept for compatibility with existing installs. */
    get database(): string {
        return path.join(this.userData, 'users.db');
    },

    /** Attachments of personnel history entries: history_files/<userId>/<entryId>/<file>. */
    get historyFiles(): string {
        return path.join(this.userData, 'history_files');
    },

    /** Report templates uploaded by users. */
    get reports(): string {
        return path.join(this.userData, 'reports');
    },

    /** Working copies of the bundled DOCX templates. */
    get userTemplates(): string {
        return path.join(this.userData, 'templates');
    },

    get backupsRoot(): string {
        return path.join(this.userData, 'backups');
    },

    /** Scheduled local snapshots (plain SQLite copies, same trust level as the live DB). */
    get autoBackups(): string {
        return path.join(this.backupsRoot, 'auto');
    },

    /** Snapshots taken automatically before migrations, restores and resets. */
    get safetyBackups(): string {
        return path.join(this.backupsRoot, 'safety');
    },

    /**
     * Whole data sets put away by «Почати з нуля» on the sign-in screen, each with the key that
     * opens it. Never pruned; only full destruction removes them.
     */
    get setAsideData(): string {
        return path.join(this.backupsRoot, 'set-aside');
    },

    /** Size and place of the window between starts (geometry only). */
    get windowStateFile(): string {
        return path.join(this.userData, 'window-state.json');
    },

    get settingsFile(): string {
        return path.join(this.userData, 'settings.json');
    },

    /** Per-installation identity. Never included in backups. */
    get instanceFile(): string {
        return path.join(this.userData, 'instance.json');
    },

    /**
     * The data key protected by Windows and by each account's password (see DataVault).
     * Without it the encrypted data cannot be read — full destruction shreds it.
     */
    get keystoreFile(): string {
        return path.join(this.userData, 'keystore.json');
    },

    /**
     * Working folders of multi-step file operations (backup import, change-log exchange,
     * PDF previews). Everything temporary stays here, never in the Windows temp folder, and
     * the folder is emptied on every start.
     */
    get staging(): string {
        return path.join(this.userData, '.staging');
    },

    get appRoot(): string {
        return app.getAppPath();
    },

    get bundledTemplates(): string {
        return app.isPackaged
            ? path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'templates')
            : path.join(this.appRoot, 'assets', 'templates');
    },

    get windowIcon(): string {
        const file =
            process.platform === 'win32'
                ? 'appIcon.ico'
                : process.platform === 'darwin'
                  ? 'appIcon.icns'
                  : 'appIcon.png';
        return path.join(this.appRoot, 'assets', 'icons', file);
    },

    get preload(): string {
        return path.join(__dirname, 'preload.js');
    },

    get rendererIndex(): string {
        return path.join(this.appRoot, 'renderer_dist', 'index.html');
    },
};

/** True for the app's own page (`renderer_dist/index.html`), with or without a hash. */
export function isAppPageUrl(url: string): boolean {
    if (!url.startsWith('file://')) return false;
    try {
        const page = fileURLToPath(url.split(/[?#]/)[0]);
        return (
            path.resolve(page).toLowerCase() === path.resolve(AppPaths.rendererIndex).toLowerCase()
        );
    } catch {
        return false;
    }
}

/** Directories that belong to the user's data set (included in full backups and resets). */
export const DATA_DIRECTORIES = [
    { name: 'history_files', resolve: () => AppPaths.historyFiles },
    { name: 'reports', resolve: () => AppPaths.reports },
    { name: 'templates', resolve: () => AppPaths.userTemplates },
] as const;

/**
 * Of those, the folders with personal content (attachments, uploaded and generated documents):
 * stored encrypted. `templates` holds the blank forms shipped with the app.
 */
export const PRIVATE_DATA_DIRECTORIES = DATA_DIRECTORIES.filter((dir) => dir.name !== 'templates');

/**
 * Joins segments onto `base` and guarantees the result stays inside `base`.
 * Use for every path that contains a value coming from the renderer or from a file.
 */
export function resolveInside(base: string, ...segments: string[]): string {
    const root = path.resolve(base);
    const target = path.resolve(root, ...segments);
    const relative = path.relative(root, target);
    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Path escapes its base directory: ${segments.join('/')}`);
    }
    return target;
}

/** Keeps only the last path component and strips characters Windows does not allow. */
export function safeFileName(name: string): string {
    const base = String(name ?? '')
        .split(/[\\/]/)
        .pop()
        // eslint-disable-next-line no-control-regex -- control characters are invalid in Windows file names
        ?.replace(/[<>:"|?*\u0000-\u001f]/g, '_')
        .trim();
    if (!base || base === '.' || base === '..') throw new Error('Invalid file name');
    return base;
}
