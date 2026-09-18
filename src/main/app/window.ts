import { app, BrowserWindow, Menu, screen, session } from 'electron';

import { createLogger } from '../core/logger';
import { AppPaths, isAppPageUrl } from '../core/paths';
import { rememberWindowState, usableBounds, type WindowState } from './windowState';

const logger = createLogger('window');
export const DEV_SERVER_URL = 'http://localhost:5173';

const ALLOWED_PERMISSIONS = new Set(['clipboard-sanitized-write', 'fullscreen']);

/** App-wide Electron hardening. Call once after `app.whenReady()`. */
export function applySecurityPolicies(isDev: boolean): void {
    // No spell checking at all: it would start the Windows spelling service, which keeps
    // its own dictionaries in the user's profile.
    session.defaultSession.setSpellCheckerEnabled(false);
    session.defaultSession.setSpellCheckerLanguages([]);

    // Deny camera, microphone, geolocation, notifications... the app needs none of them.
    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) =>
        callback(ALLOWED_PERMISSIONS.has(permission)),
    );
    session.defaultSession.setPermissionCheckHandler((_contents, permission) =>
        ALLOWED_PERMISSIONS.has(permission),
    );

    // Files leave the app only through the main process (`files:save`), which writes them
    // without leaving a trace in Windows. A browser download would go through a dialog that
    // records the file in the registry, so none is allowed.
    session.defaultSession.on('will-download', (event) => {
        logger.warn('Blocked a browser download');
        event.preventDefault();
    });

    app.on('web-contents-created', (_event, contents) => {
        contents.on('will-attach-webview', (event) => event.preventDefault());
        contents.setWindowOpenHandler(() => ({ action: 'deny' }));
        // Only the app's own page. A file dropped onto the window would otherwise open in it
        // (and a dropped HTML page would get the app's bridge).
        contents.on('will-navigate', (event, url) => {
            const allowed = isAppPageUrl(url) || (isDev && url.startsWith(DEV_SERVER_URL));
            if (!allowed) {
                logger.warn('Blocked navigation away from the app page');
                event.preventDefault();
            }
        });
    });

    if (!isDev) {
        // No default menu: removes reload/devtools accelerators. macOS keeps edit shortcuts.
        Menu.setApplicationMenu(
            process.platform === 'darwin'
                ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }])
                : null,
        );
    }
}

/**
 * Removes everything Chromium keeps for the window on disk (local storage, caches, code
 * cache). Part of a full reset: the app starts as if it was just installed.
 */
export async function clearBrowserData(): Promise<void> {
    const browser = session.defaultSession;
    await browser.clearStorageData();
    await browser.clearCache();
    await browser.clearCodeCaches({});
}

/** Smallest window the screens still fit into (sidebar + a readable table). */
const MIN_WINDOW = { width: 960, height: 600 };

/**
 * Size of the window when it is not maximized (the title-bar button): most of the screen,
 * never smaller than the app can work in.
 */
function restoredSize(workArea: { width: number; height: number }) {
    const fit = (share: number, total: number, min: number) =>
        Math.min(total, Math.max(min, Math.round(total * share)));
    return {
        width: fit(0.6, workArea.width, MIN_WINDOW.width),
        height: fit(0.7, workArea.height, MIN_WINDOW.height),
    };
}

export function createMainWindow(
    isDev: boolean,
    state: WindowState = { bounds: null, maximized: true },
): BrowserWindow {
    const workArea = screen.getPrimaryDisplay().workAreaSize;
    // The size and place of the last start, if it still fits on a screen.
    const saved = usableBounds(
        state.bounds,
        screen.getAllDisplays().map((display) => display.workArea),
        MIN_WINDOW,
    );
    const window = new BrowserWindow({
        ...(saved ?? { ...restoredSize(workArea), center: true }),
        minWidth: Math.min(MIN_WINDOW.width, workArea.width),
        minHeight: Math.min(MIN_WINDOW.height, workArea.height),
        show: false,
        backgroundColor: '#f3f3ec',
        icon: AppPaths.windowIcon,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: AppPaths.preload,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webviewTag: false,
            spellcheck: false,
            devTools: isDev,
        },
    });

    // Opens as it was closed (maximized on the first start); the title-bar button switches
    // between maximized and the smaller window.
    window.once('ready-to-show', () => {
        if (state.maximized) window.maximize();
        window.show();
    });
    rememberWindowState(window);

    // Renderer problems end up in the log file that units send back for diagnostics.
    const contents = window.webContents;
    contents.on('did-finish-load', () => logger.info('Renderer loaded'));
    contents.on('did-fail-load', (_e, code, description, url) =>
        logger.error(`Renderer failed to load (${code} ${description}) ${url}`),
    );
    contents.on('preload-error', (_e, preloadPath, error) =>
        logger.error(`Preload error in ${preloadPath}`, error),
    );
    contents.on('render-process-gone', (_e, details) =>
        logger.error(`Renderer process gone: ${details.reason} (${details.exitCode})`),
    );
    contents.on('console-message', (_e, level, message, line, sourceId) => {
        if (level >= 3) logger.error(`Renderer console: ${message} (${sourceId}:${line})`);
    });

    // Development only: use the built renderer instead of the Vite dev server
    // (lets automated UI checks run without starting the dev server).
    if (isDev && process.env.PMA_RENDERER === 'built') {
        void window.loadFile(AppPaths.rendererIndex);
        return window;
    }

    if (isDev) {
        void window.loadURL(DEV_SERVER_URL);
        window.webContents.openDevTools({ mode: 'detach' });
    } else {
        void window.loadFile(AppPaths.rendererIndex);
    }
    return window;
}
