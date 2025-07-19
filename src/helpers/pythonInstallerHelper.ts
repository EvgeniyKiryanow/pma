import { existsSync } from 'fs';
import path from 'path';
import { shell, dialog, app, net } from 'electron';
import { execFileSync } from 'child_process';
import https from 'https';
import fs from 'fs';
import os from 'os';

// ✅ Always resolve paths correctly in packaged/unpacked mode
function resolveAssetsPath(...segments: string[]) {
    return app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', ...segments)
        : path.join(__dirname, ...segments);
}

function hasInternetConnection(): Promise<boolean> {
    return new Promise((resolve) => {
        const req = net.request('https://www.python.org/');
        req.on('response', () => resolve(true));
        req.on('error', () => resolve(false));
        req.end();
    });
}

// ✅ Detect system python (Windows + macOS/Linux)
function findSystemPython(): string | null {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');

    try {
        // ✅ 1. Try PATH first
        const whichCmd = process.platform === 'win32' ? 'where' : 'which';

        const tryCmd = (cmd: string) => {
            try {
                const output = execFileSync(whichCmd, [cmd], { encoding: 'utf8' })
                    .split(/\r?\n/)[0]
                    .trim();
                return output && fs.existsSync(output) ? output : null;
            } catch (_) {
                return null;
            }
        };

        const detected = tryCmd('python3') || tryCmd('python');
        if (detected) return detected;

        // ✅ 2. Platform-specific deeper scan
        if (process.platform === 'win32') {
            const userDir = process.env.USERPROFILE || '';
            const localAppData = process.env.LOCALAPPDATA || '';
            const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
            const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

            const possibleDirs = [
                path.join(localAppData, 'Programs', 'Python'),
                path.join(userDir, 'AppData', 'Local', 'Programs', 'Python'),
                path.join(programFiles, 'Python'),
                path.join(programFilesX86, 'Python'),
                'C:\\Python38',
                'C:\\Python39',
                'C:\\Python310',
                'C:\\Python311',
            ];

            for (const base of possibleDirs) {
                if (!fs.existsSync(base)) continue;

                // Check for subdirectories like Python311
                const subdirs = fs.readdirSync(base, { withFileTypes: true });
                for (const dir of subdirs) {
                    if (dir.isDirectory() && dir.name.startsWith('Python3')) {
                        const candidate = path.join(base, dir.name, 'python.exe');
                        if (fs.existsSync(candidate)) return candidate;
                    }
                }

                const direct = path.join(base, 'python.exe');
                if (fs.existsSync(direct)) return direct;
            }
        }

        if (process.platform === 'darwin') {
            // ✅ macOS common locations
            const macPaths = [
                '/usr/local/bin/python3', // Intel mac default
                '/opt/homebrew/bin/python3', // Apple Silicon Homebrew
                '/Library/Frameworks/Python.framework/Versions/3.11/bin/python3',
                '/Library/Frameworks/Python.framework/Versions/3.10/bin/python3',
                '/Library/Frameworks/Python.framework/Versions/3.9/bin/python3',
            ];
            for (const candidate of macPaths) {
                if (fs.existsSync(candidate)) return candidate;
            }
        }

        if (process.platform === 'linux') {
            // ✅ Linux fallback
            const linuxPaths = ['/usr/bin/python3', '/usr/local/bin/python3', '/bin/python3'];
            for (const candidate of linuxPaths) {
                if (fs.existsSync(candidate)) return candidate;
            }
        }
    } catch (err) {
        console.warn('⚠️ Python detection failed:', err);
    }

    return null; // ❌ Not found
}

// ✅ Get python exe + morphy.py path (keeps same name)
export function getPythonPaths(): { python: string; script: string } {
    const base = resolveAssetsPath('assets', 'python');
    const script = path.join(base, 'morphy.py');

    let python = getInstalledPythonPath();

    // Fallback → embedded python.exe if you ship it
    const embeddedPython = path.join(base, 'python.exe');
    if (!python && existsSync(embeddedPython)) {
        python = embeddedPython;
    }

    console.log('📂 Python base dir:', base);
    console.log('🐍 Script path:', script);
    console.log('🐍 Python executable:', python ?? 'NOT FOUND');

    return { python: python ?? '', script };
}

// ✅ Keep original name but use robust detection
export function getInstalledPythonPath(): string | null {
    const systemPython = findSystemPython();
    if (systemPython) return systemPython;
    return null; // nothing found → will trigger promptInstallPython
}

// ✅ Check if python binary exists (unchanged)
export function isPythonAvailable(pythonPath: string): boolean {
    return pythonPath !== '' && existsSync(pythonPath);
}

// ✅ Offline installer path (unchanged)
export function getInstallerPath() {
    const base = resolveAssetsPath('assets', 'python', 'installer');

    if (process.platform === 'win32') {
        return path.join(base, 'python-3.8.8-amd64.exe');
    }
    if (process.platform === 'darwin') {
        return path.join(base, 'python-3.13.5-macos11.pkg');
    }
    return null;
}

function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https
            .get(url, (response) => {
                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed HTTP ${response.statusCode}`));
                }
                response.pipe(file);
                file.on('finish', () => file.close(() => resolve()));
            })
            .on('error', (err) => {
                fs.unlinkSync(dest);
                reject(err);
            });
    });
}
// ✅ Prompt to install python if missing (unchanged)
export async function promptInstallPython(): Promise<string | null> {
    const installerPath = getInstallerPath();
    const online = await hasInternetConnection();
    const tmpDir = os.tmpdir();

    const url =
        process.platform === 'win32'
            ? 'https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe'
            : 'https://www.python.org/ftp/python/3.11.8/python-3.11.8-macos11.pkg';

    const tmpInstaller =
        process.platform === 'win32'
            ? path.join(tmpDir, 'python-latest.exe')
            : path.join(tmpDir, 'python-latest.pkg');

    if (online) {
        console.log(`🌐 Internet detected → downloading ${url}`);

        try {
            await downloadFile(url, tmpInstaller);
            console.log('✅ Download complete:', tmpInstaller);

            if (process.platform === 'win32') {
                try {
                    console.log('📦 Running Python installer silently...');
                    execFileSync(tmpInstaller, ['/quiet', 'InstallAllUsers=1', 'PrependPath=1'], {
                        stdio: 'inherit',
                    });
                    console.log('✅ Silent Python install complete');

                    // ✅ Immediately rescan python path
                    const python = findSystemPython();
                    if (python) {
                        console.log('🐍 Python found after install:', python);
                        return python;
                    } else {
                        console.warn(
                            '⚠️ Python not found after silent install → restart may be needed',
                        );
                        return null;
                    }
                } catch (err) {
                    console.warn('⚠️ Silent install failed → running interactive installer', err);
                    await shell.openPath(tmpInstaller);
                    return null; // user must finish manually
                }
            } else {
                console.log('📦 macOS → opening .pkg installer');
                await shell.openPath(tmpInstaller);
                return null; // user must finish manually
            }
        } catch (err) {
            console.error('❌ Download failed → fallback offline installer', err);
        }
    } else {
        console.warn('⚠️ No internet → fallback to offline installer');
    }

    // ✅ Fallback: offline installer
    if (installerPath && existsSync(installerPath)) {
        if (process.platform === 'win32') {
            try {
                console.log('📦 Running offline Python installer silently...');
                execFileSync(installerPath, ['/quiet', 'InstallAllUsers=1', 'PrependPath=1'], {
                    stdio: 'inherit',
                });
                console.log('✅ Offline Python installed');

                const python = findSystemPython();
                if (python) return python;
            } catch (err) {
                console.warn('⚠️ Offline silent install failed → running interactive', err);
                await shell.openPath(installerPath);
            }
        } else {
            console.log('📦 macOS → opening offline .pkg installer');
            await shell.openPath(installerPath);
        }
        return null;
    }

    dialog.showErrorBox(
        'Python installer missing',
        'No internet connection and no offline installer found.',
    );
    return null;
}

// ✅ Helper: check if user has internet
async function hasInternet(): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            const req = https.get('https://pypi.org', { timeout: 3000 }, (res) => {
                res.destroy();
                resolve(true);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        } catch (_) {
            resolve(false);
        }
    });
}

export async function installMorphyPackages(pythonPath: string) {
    const pkgDir = resolveAssetsPath('assets', 'python', 'packages');
    const wheels = [
        'pymorphy3-2.0.4-py3-none-any.whl',
        'pymorphy3_dicts_uk-2.4.1.1.1663094765-py2.py3-none-any.whl',
    ];

    try {
        console.log('🔍 Bootstrapping pip...');
        try {
            execFileSync(pythonPath, ['-m', 'ensurepip', '--default-pip'], {
                stdio: 'inherit',
            });
        } catch (err) {
            console.warn('⚠️ ensurepip failed (pip may already exist)', err);
        }

        console.log('🔄 Upgrading pip & wheel...');
        try {
            execFileSync(pythonPath, ['-m', 'pip', 'install', '--upgrade', 'pip', 'wheel'], {
                stdio: 'inherit',
            });
        } catch (err) {
            console.warn('⚠️ pip upgrade failed but continuing', err);
        }

        // ✅ STEP 1: Try offline installation first
        console.log('📦 Attempting offline wheel install from:', pkgDir);

        let offlineSuccess = true;
        for (const wheel of wheels) {
            const wheelPath = path.resolve(pkgDir, wheel);
            if (!existsSync(wheelPath)) {
                console.warn(`⚠️ Missing wheel: ${wheelPath}`);
                offlineSuccess = false;
                continue;
            }
            try {
                console.log(`📦 Installing wheel: ${wheelPath}`);
                execFileSync(
                    pythonPath,
                    ['-m', 'pip', 'install', '--no-index', '--find-links', pkgDir, wheelPath],
                    { stdio: 'inherit' },
                );
                console.log(`✅ Installed offline: ${wheel}`);
            } catch (err) {
                console.error(`❌ Failed installing offline wheel ${wheel}`, err);
                offlineSuccess = false;
            }
        }

        if (offlineSuccess) {
            console.log('✅ All pymorphy3 wheels installed offline');
            return;
        }

        // ✅ STEP 2: If offline failed → check internet
        const online = await hasInternet();
        if (online) {
            console.log('🌐 Internet detected → installing from PyPI...');
            try {
                execFileSync(
                    pythonPath,
                    ['-m', 'pip', 'install', '--upgrade', 'pymorphy3', 'pymorphy3-dicts-uk'],
                    { stdio: 'inherit' },
                );
                console.log('✅ Installed pymorphy3 & dicts from PyPI');
                return;
            } catch (err) {
                console.error('❌ PyPI install failed', err);
            }
        } else {
            console.warn('⚠️ No internet → cannot fallback to PyPI');
        }

        console.error('❌ pymorphy3 installation failed (offline & online)');
    } catch (e) {
        console.error('❌ Global failure installing pymorphy3', e);
    }
}

export async function ensurePythonAndMorphy() {
    let { python } = getPythonPaths();

    if (!isPythonAvailable(python)) {
        console.warn('⚠️ Python not found → prompting install');

        const installed = await promptInstallPython(); // ⬅️ this downloads & installs

        if (installed) {
            // ✅ After install, try again
            python = installed;
        } else {
            console.warn('⚠️ User must restart app after manual installation');
            return; // stop, cannot install libs yet
        }
    }

    if (python && isPythonAvailable(python)) {
        console.log('✅ Python ready → installing pymorphy3');
        await installMorphyPackages(python);
    } else {
        console.error('❌ Python still not found, cannot install pymorphy3');
    }
}
