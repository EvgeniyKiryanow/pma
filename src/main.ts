import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import started from 'electron-squirrel-startup';
import { registerDbHandlers } from './ipc';
import log from 'electron-log';
import { initializeDb } from './database/db';
import { upgradeDbSchema } from './database/migrations';
import fs from 'fs';
import { exec, execFile } from 'child_process';
import { ipcMain } from 'electron';
import { initPythonEnvSimplified } from './helpers/pythonInstallerHelper';

// ✅ Import our updater functions
import { setupAutoUpdater, autoCheckOnStartup } from './autoUpdaterHandler';

export function copyAllTemplates() {
    const sourceDir = path.join(__dirname, 'assets/templates');
    const destDir = path.join(app.getPath('userData'), 'templates');

    fs.mkdirSync(destDir, { recursive: true });

    const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.docx'));

    files.forEach((file) => {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(destDir, file);

        if (!fs.existsSync(destPath)) {
            fs.copyFileSync(sourcePath, destPath);
            console.log(`✅ Copied: ${file}`);
        } else {
            console.log(`ℹ️ Already exists: ${file}`);
        }
    });
}

export function resetUserTemplates() {
    const userTemplatesDir = path.join(app.getPath('userData'), 'templates');
    const defaultTemplatesDir = path.join(process.resourcesPath, 'assets', 'templates');

    if (!fs.existsSync(defaultTemplatesDir)) {
        console.warn('⚠️ Default templates folder not found:', defaultTemplatesDir);
        return;
    }

    // Load names of default templates
    const defaultFiles = fs
        .readdirSync(defaultTemplatesDir)
        .filter((file) => file.endsWith('.docx'));

    if (fs.existsSync(userTemplatesDir)) {
        const userFiles = fs.readdirSync(userTemplatesDir).filter((file) => file.endsWith('.docx'));

        for (const file of userFiles) {
            if (!defaultFiles.includes(file)) {
                const fullPath = path.join(userTemplatesDir, file);
                try {
                    fs.unlinkSync(fullPath);
                    console.log(`🗑 Deleted template: ${file}`);
                } catch (err) {
                    console.warn(`⚠️ Failed to delete ${file}:`, err);
                }
            }
        }
    }
}

export function convertDocxToPdf(inputPath: string, outputDir: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const libreOfficeCmd = `soffice --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;
        exec(libreOfficeCmd, (error, stdout, stderr) => {
            if (error) {
                reject(`LibreOffice error: ${stderr || error.message}`);
                return;
            }

            const outputFile = path.join(
                outputDir,
                path.basename(inputPath).replace(/\.docx$/, '.pdf'),
            );
            if (fs.existsSync(outputFile)) {
                resolve(outputFile);
            } else {
                reject('PDF not created.');
            }
        });
    });
}

let globalPythonPath: string | null = null;
let globalMorphyScript: string | null = null;

async function initPythonEnv() {
    const { python, script } = await initPythonEnvSimplified();
    if (!python) return false;
    globalPythonPath = python;
    globalMorphyScript = script;
    return true;
}

ipcMain.handle('analyze-words', async (_event, phrase: string) => {
    if (!globalPythonPath) throw new Error('Python not ready');
    return new Promise((resolve, reject) => {
        execFile(
            globalPythonPath!,
            [globalMorphyScript!, JSON.stringify(phrase)],
            {
                encoding: 'utf8',
                env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
            },
            (error, stdout) => {
                if (error) return reject(error);
                try {
                    resolve(JSON.parse(stdout));
                } catch {
                    reject('JSON parse error: ' + stdout);
                }
            },
        );
    });
});

// ✅ Main window create function
const iconPath = path.join(
    __dirname,
    '..',
    'assets',
    'icons',
    process.platform === 'win32'
        ? 'appIcon.ico'
        : process.platform === 'linux'
          ? 'appIcon.png'
          : 'appIcon.icns',
);

const isDev = !app.isPackaged;

if (started) app.quit();

const createWindow = () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const mainWindow = new BrowserWindow({
        width: Math.floor(width),
        height: Math.floor(height),
        icon: iconPath,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        const indexPath = path.join(app.getAppPath(), 'renderer_dist/index.html');
        mainWindow.loadFile(indexPath);
    }
};

// ✅ Handle App Startup
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

app.whenReady().then(async () => {
    const { python, script } = await initPythonEnvSimplified();

    if (!python) {
        console.warn('⚠️ Python env not ready');
    } else {
        globalPythonPath = python;
        globalMorphyScript = script;
    }

    registerDbHandlers();
    await initializeDb();
    await upgradeDbSchema();
    copyAllTemplates();
    // setupAutoUpdater();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
