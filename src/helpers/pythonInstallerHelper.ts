// ✅ Full working Python + pymorphy3 installer helper
import { existsSync } from 'fs';
import path from 'path';
import { shell, dialog, app, net } from 'electron';
import { execFileSync, spawnSync } from 'child_process';
import https from 'https';
import fs from 'fs';
import os from 'os';

// ✅ Always resolve paths correctly in packaged/unpacked mode
function resolveAssetsPath(...segments: string[]) {
    return app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', ...segments)
        : path.join(__dirname, ...segments);
}

// ✅ Check internet connectivity
function hasInternetConnection(): Promise<boolean> {
    return new Promise((resolve) => {
        const req = net.request('https://www.python.org/');
        req.on('response', () => resolve(true));
        req.on('error', () => resolve(false));
        req.end();
    });
}

// ✅ Detect Python on PATH or common folders
function findSystemPython(): string | null {
    try {
        const whichCmd = process.platform === 'win32' ? 'where' : 'which';

        const tryCmd = (cmd: string) => {
            try {
                const output = execFileSync(whichCmd, [cmd], { encoding: 'utf8' })
                    .split(/\r?\n/)[0]
                    .trim();
                return output && existsSync(output) ? output : null;
            } catch (_) {
                return null;
            }
        };

        const detected = tryCmd('python3') || tryCmd('python');
        if (detected) return detected;

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
                'C:\\Python311',
                'C:\\Python310',
                'C:\\Python39',
                'C:\\Python38',
            ];

            for (const base of possibleDirs) {
                if (!existsSync(base)) continue;
                const subdirs = fs.readdirSync(base, { withFileTypes: true });
                for (const dir of subdirs) {
                    if (dir.isDirectory() && dir.name.startsWith('Python3')) {
                        const candidate = path.join(base, dir.name, 'python.exe');
                        if (existsSync(candidate)) return candidate;
                    }
                }
                const direct = path.join(base, 'python.exe');
                if (existsSync(direct)) return direct;
            }
        }

        if (process.platform === 'darwin') {
            const macPaths = [
                '/usr/local/bin/python3',
                '/opt/homebrew/bin/python3',
                '/Library/Frameworks/Python.framework/Versions/3.11/bin/python3',
                '/Library/Frameworks/Python.framework/Versions/3.10/bin/python3',
            ];
            for (const candidate of macPaths) if (existsSync(candidate)) return candidate;
        }

        if (process.platform === 'linux') {
            const linuxPaths = ['/usr/bin/python3', '/usr/local/bin/python3', '/bin/python3'];
            for (const candidate of linuxPaths) if (existsSync(candidate)) return candidate;
        }
    } catch (err) {
        console.warn('⚠️ Python detection failed:', err);
    }
    return null;
}

// ✅ Paths for Python & morphy.py
export function getPythonPaths(): { python: string; script: string } {
    const base = resolveAssetsPath('assets', 'python');
    const script = path.join(base, 'morphy.py');

    let python = getInstalledPythonPath();
    const embeddedPython = path.join(base, 'python.exe');
    if (!python && existsSync(embeddedPython)) python = embeddedPython;

    console.log('📂 Python base dir:', base);
    console.log('🐍 Script path:', script);
    console.log('🐍 Python executable:', python ?? 'NOT FOUND');

    return { python: python ?? '', script };
}

export function getInstalledPythonPath(): string | null {
    const sys = findSystemPython();
    return sys ?? null;
}

export function isPythonAvailable(pythonPath: string): boolean {
    return pythonPath !== '' && existsSync(pythonPath);
}

export function getInstallerPath() {
    const base = resolveAssetsPath('assets', 'python', 'installer');
    if (process.platform === 'win32') return path.join(base, 'python-3.8.8-amd64.exe');
    if (process.platform === 'darwin') return path.join(base, 'python-3.13.5-macos11.pkg');
    return null;
}

function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https
            .get(url, (response) => {
                if (response.statusCode !== 200)
                    return reject(new Error(`HTTP ${response.statusCode}`));
                response.pipe(file);
                file.on('finish', () => file.close(() => resolve()));
            })
            .on('error', (err) => {
                if (existsSync(dest)) fs.unlinkSync(dest);
                reject(err);
            });
    });
}

// ✅ MAIN: Download + install Python if missing
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

            // avoid EBUSY by waiting
            await new Promise((res) => setTimeout(res, 2000));

            if (process.platform === 'win32') {
                try {
                    console.log('📦 Silent Python installer running...');
                    spawnSync(tmpInstaller, ['/quiet', 'InstallAllUsers=1', 'PrependPath=1'], {
                        stdio: 'inherit',
                        windowsHide: true,
                    });
                    console.log('✅ Silent Python install complete');

                    // wait for PATH refresh
                    await new Promise((res) => setTimeout(res, 5000));

                    const python = findSystemPython();
                    if (!python) {
                        console.warn('⚠️ Python still not in PATH, restart required');
                        return null;
                    }
                    console.log('🐍 Python detected after install:', python);
                    return python;
                } catch (err) {
                    console.warn('⚠️ Silent install failed, opening interactive', err);
                    await shell.openPath(tmpInstaller);
                    return null;
                }
            } else {
                console.log('📦 macOS → opening .pkg installer');
                await shell.openPath(tmpInstaller);
                return null;
            }
        } catch (err) {
            console.error('❌ Download failed, fallback offline', err);
        }
    } else {
        console.warn('⚠️ No internet → fallback offline installer');
    }

    // fallback offline installer
    if (installerPath && existsSync(installerPath)) {
        if (process.platform === 'win32') {
            try {
                console.log('📦 Running offline installer silently...');
                spawnSync(installerPath, ['/quiet', 'InstallAllUsers=1', 'PrependPath=1'], {
                    stdio: 'inherit',
                    windowsHide: true,
                });
                console.log('✅ Offline Python installed');
                const python = findSystemPython();
                if (python) return python;
            } catch (err) {
                console.warn('⚠️ Offline silent failed, opening interactive', err);
                await shell.openPath(installerPath);
            }
        } else {
            console.log('📦 macOS → offline pkg');
            await shell.openPath(installerPath);
        }
        return null;
    }

    dialog.showErrorBox(
        'Python installer missing',
        'No internet & no offline installer available.',
    );
    return null;
}

// ✅ Helper: check if user has internet for pip
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

// ✅ Install pymorphy3 wheels or PyPI fallback
export async function installMorphyPackages(pythonPath: string) {
    const pkgDir = resolveAssetsPath('assets', 'python', 'packages');
    const wheels = [
        'pymorphy3-2.0.4-py3-none-any.whl',
        'pymorphy3_dicts_uk-2.4.1.1.1663094765-py2.py3-none-any.whl',
    ];

    console.log('🔍 Ensuring pip is available...');
    spawnSync(pythonPath, ['-m', 'ensurepip', '--default-pip'], {
        stdio: 'inherit',
        windowsHide: true,
    });

    console.log('🔄 Upgrading pip & wheel...');
    spawnSync(pythonPath, ['-m', 'pip', 'install', '--upgrade', 'pip', 'wheel'], {
        stdio: 'inherit',
        windowsHide: true,
    });

    // ✅ small delay so pip finishes setup
    await new Promise((r) => setTimeout(r, 2000));

    // ✅ STEP 1: Try OFFLINE installation first
    let offlineSuccess = true;
    for (const wheel of wheels) {
        const wheelPath = path.resolve(pkgDir, wheel);
        if (!existsSync(wheelPath)) {
            console.warn(`⚠️ Missing wheel: ${wheelPath}`);
            offlineSuccess = false;
            continue;
        }
        console.log(`📦 Installing offline wheel: ${wheelPath}`);
        const installOffline = spawnSync(
            pythonPath,
            ['-m', 'pip', 'install', '--no-index', '--find-links', pkgDir, wheelPath],
            { stdio: 'inherit', windowsHide: true },
        );
        if (installOffline.status !== 0) {
            console.error(`❌ Offline wheel failed: ${wheel}`);
            offlineSuccess = false;
        } else {
            console.log(`✅ Installed offline: ${wheel}`);
        }
    }

    if (offlineSuccess) {
        console.log('✅ All pymorphy3 wheels installed offline successfully');
        return;
    }

    // ✅ STEP 2: If offline fails → try PyPI online
    const online = await hasInternet();
    if (online) {
        console.log('🌐 Internet detected → installing from PyPI...');
        const onlineInstall = spawnSync(
            pythonPath,
            ['-m', 'pip', 'install', '--upgrade', 'pymorphy3', 'pymorphy3-dicts-uk'],
            { stdio: 'inherit', windowsHide: true },
        );

        if (onlineInstall.status === 0) {
            console.log('✅ Installed pymorphy3 & dicts from PyPI');
            return;
        } else {
            console.error('❌ PyPI install failed. stdout:', onlineInstall.stdout?.toString());
            console.error('stderr:', onlineInstall.stderr?.toString());
        }
    } else {
        console.warn('⚠️ No internet → cannot install from PyPI');
    }

    console.error('❌ pymorphy3 installation failed (both offline & online)');
}

// ✅ Combined: ensure Python + install libs
export async function ensurePythonAndMorphy() {
    let { python } = getPythonPaths();
    if (!isPythonAvailable(python)) {
        console.warn('⚠️ Python not found → prompting install');
        const installed = await promptInstallPython();
        if (installed) python = installed;
        else {
            console.warn('⚠️ Restart required after manual install');
            return;
        }
    }

    if (python && isPythonAvailable(python)) {
        console.log('✅ Python ready → installing pymorphy3');
        await installMorphyPackages(python);
    } else {
        console.error('❌ Python still missing → cannot install pymorphy3');
    }
}
