import { app, BrowserWindow, Menu, screen, session } from 'electron';

import { createLogger } from '../core/logger';
import { AppPaths } from '../core/paths';

const logger = createLogger('window');
export const DEV_SERVER_URL = 'http://localhost:5173';

const ALLOWED_PERMISSIONS = new Set(['clipboard-sanitized-write', 'fullscreen']);

/** App-wide Electron hardening. Call once after `app.whenReady()`. */
export function applySecurityPolicies(isDev: boolean): void {
    // Deny camera, microphone, geolocation, notifications... the app needs none of them.
    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) =>
        callback(ALLOWED_PERMISSIONS.has(permission)),
    );
    session.defaultSession.setPermissionCheckHandler((_contents, permission) =>
        ALLOWED_PERMISSIONS.has(permission),
    );

    app.on('web-contents-created', (_event, contents) => {
        contents.on('will-attach-webview', (event) => event.preventDefault());
        contents.setWindowOpenHandler(() => ({ action: 'deny' }));
        contents.on('will-navigate', (event, url) => {
            const allowed = isDev ? url.startsWith(DEV_SERVER_URL) : url.startsWith('file://');
            if (!allowed) {
                logger.warn('Blocked navigation to an external URL');
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

export function createMainWindow(isDev: boolean): BrowserWindow {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const window = new BrowserWindow({
        width,
        height,
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

    window.once('ready-to-show', () => window.show());

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
