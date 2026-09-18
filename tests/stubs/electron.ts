import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Minimal Electron stub for tests. `userData` points at a temp folder so anything the code
 * under test writes stays out of the real application data.
 */
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pma-test-'));

const paths: Record<string, string> = {
    userData: path.join(root, 'userData'),
    temp: path.join(root, 'temp'),
    logs: path.join(root, 'logs'),
    appData: root,
};

for (const dir of Object.values(paths)) fs.mkdirSync(dir, { recursive: true });

export const app = {
    isPackaged: false,
    isReady: () => true,
    whenReady: async (): Promise<void> => undefined,
    getVersion: () => '0.0.0-test',
    getName: () => 'p-manager-test',
    getAppPath: () => process.cwd(),
    getPath: (name: string) => paths[name] ?? path.join(root, name),
    setPath: (name: string, value: string) => {
        paths[name] = value;
    },
    on: (): void => undefined,
    once: (): void => undefined,
    quit: (): void => undefined,
    exit: (): void => undefined,
    requestSingleInstanceLock: () => true,
    removeAllListeners: (): void => undefined,
};

export const ipcMain = {
    handle: (): void => undefined,
    on: (): void => undefined,
    removeHandler: (): void => undefined,
};

export const dialog = {
    showSaveDialog: async (): Promise<{ canceled: boolean; filePath?: string }> => ({ canceled: true }),
    showOpenDialog: async (): Promise<{ canceled: boolean; filePaths: string[] }> => ({
        canceled: true,
        filePaths: [],
    }),
    showErrorBox: (): void => undefined,
    showMessageBox: async () => ({ response: 0 }),
};

export const shell = { openPath: async () => '' };

export const session = {
    defaultSession: {
        setPermissionRequestHandler: (): void => undefined,
        setPermissionCheckHandler: (): void => undefined,
    },
};

export class BrowserWindow {
    static fromWebContents = (): BrowserWindow | null => null;
    static getAllWindows = (): BrowserWindow[] => [];
    webContents = { id: 1, send: (): void => undefined, once: (): void => undefined, on: (): void => undefined };
}

export const Menu = { setApplicationMenu: (): void => undefined, buildFromTemplate: () => ({}) };
let clipboardText = '';
export const clipboard = {
    readText: () => clipboardText,
    writeText: (text: string) => {
        clipboardText = text;
    },
    clear: () => {
        clipboardText = '';
    },
};
export const powerMonitor = { on: (): void => undefined };
export const screen = { getPrimaryDisplay: () => ({ workAreaSize: { width: 1280, height: 800 } }) };
export const contextBridge = { exposeInMainWorld: (): void => undefined };
export const ipcRenderer = { invoke: async (): Promise<void> => undefined, on: (): void => undefined, send: (): void => undefined };

export default {
    app,
    ipcMain,
    dialog,
    shell,
    session,
    BrowserWindow,
    Menu,
    screen,
    clipboard,
    powerMonitor,
};
