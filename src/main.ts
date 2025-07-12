import { app, BrowserWindow, dialog, screen } from 'electron';
import path from 'path';
import started from 'electron-squirrel-startup';
import { registerDbHandlers } from './ipc';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { initializeDb } from './database/db';
import { upgradeDbSchema } from './database/migrations';
import fs from 'fs';
import { exec, execFile } from 'child_process';
import { runHelloPython } from './runPython';
import { ipcMain } from 'electron';
import {
    getInstalledPythonPath,
    getPythonPaths,
    installMorphyPackages,
    isPythonAvailable,
    promptInstallPython,
} from './helpers/pythonInstallerHelper';

ipcMain.handle('analyze-words', async (_event, phrase: string) => {
    const pythonPath = getInstalledPythonPath(); // resolves to installed python
    const { python, script } = getPythonPaths(); // resolves to morphy.py

    return new Promise((resolve, reject) => {
        execFile(pythonPath, [script, JSON.stringify(phrase)], (error, stdout, stderr) => {
            if (error) {
                console.error('🐍 Python error:', stderr || error.message);
                return reject(error);
            }
            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (err) {
                reject('JSON parse error: ' + stdout);
            }
        });
    });
});

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
    const defaultTemplatesDir = path.join(__dirname, 'assets/templates');

    // Завантажити імена дефолтних шаблонів
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

// Prevent squirrel auto-launch on Windows
if (started) {
    app.quit();
}

// Setup logging for updater
log.transports.file.level = 'info';
autoUpdater.logger = log;
log.info('🟢 App starting…');

// ===== AUTO-UPDATER EVENTS =====
app.on('before-quit', () => {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
        win.webContents.send('clear-auth-token');
    });
});

autoUpdater.on('checking-for-update', () => {
    log.info('🔍 Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
    log.info(`⬇️ Update available: ${info.version}`);
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available and is being downloaded.`,
    });
});

autoUpdater.on('update-not-available', () => {
    log.info('✅ No updates available.');
});

autoUpdater.on('error', (err) => {
    log.error('❌ Error in auto-updater:', err?.stack || err?.message || err);
});

autoUpdater.on('download-progress', (progress) => {
    log.info(`📦 Downloading update... ${progress.percent.toFixed(2)}%`);
});

autoUpdater.on('update-downloaded', () => {
    log.info('✅ Update downloaded');

    dialog
        .showMessageBox({
            type: 'info',
            title: 'Update Ready for downloading',
            message: 'A new update has been downloaded. Restart the app now to install it?',
            buttons: ['Restart Now', 'Later'],
            defaultId: 0,
            cancelId: 1,
        })
        .then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
});

// ===== CREATE MAIN WINDOW =====
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

// ===== HANDLE APP STARTUP =====
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

app.whenReady().then(async () => {
    const { python, script } = getPythonPaths();

    if (!isPythonAvailable(python)) {
        console.warn('⚠️ Python не знайдено. Пропонуємо інсталяцію...');
        promptInstallPython(); // Просто відкриває інсталятор
        // Не зупиняємо виконання
    } else {
        installMorphyPackages(python);
    }

    registerDbHandlers();
    await initializeDb();
    await upgradeDbSchema();
    copyAllTemplates();
    createWindow();
    autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
