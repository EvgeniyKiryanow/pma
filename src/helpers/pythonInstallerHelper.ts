import { existsSync } from 'fs';
import path from 'path';
import { shell, dialog, app, net } from 'electron';
import { execFileSync, spawnSync } from 'child_process';
import https from 'https';
import fs from 'fs';
import os from 'os';

// ✅ Resolve correct path depending on packaged/dev
function resolveAssetsPath(...segments: string[]) {
    return app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', ...segments)
        : path.join(__dirname, ...segments);
}

// ✅ Quick ping to see if online
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

// ✅ Check if given Python already has pymorphy3
function checkPythonHasMorphy(pythonPath: string): boolean {
    try {
        const res = spawnSync(pythonPath, ['-m', 'pip', 'show', 'pymorphy3'], {
            stdio: 'pipe',
            encoding: 'utf-8',
            windowsHide: true,
        });
        return res.status === 0 && res.stdout.includes('Name: pymorphy3');
    } catch {
        return false;
    }
}

// ✅ Try to find an existing Python
export function findSystemPython(): string | null {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';

    const tryCmd = (cmd: string) => {
        try {
            const output = execFileSync(whichCmd, [cmd], { encoding: 'utf8' })
                .split(/\r?\n/)[0]
                .trim();
            return output && existsSync(output) ? output : null;
        } catch {
            return null;
        }
    };

    const py = tryCmd('python3') || tryCmd('python');
    if (py && checkPythonHasMorphy(py)) return py;

    if (process.platform === 'win32') {
        const dirs = [
            path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python'),
            'C:\\Python311',
            'C:\\Python310',
            'C:\\Python39',
        ];
        for (const base of dirs) {
            if (!existsSync(base)) continue;
            const pyExe = path.join(base, 'python.exe');
            if (existsSync(pyExe) && checkPythonHasMorphy(pyExe)) return pyExe;
        }
    }

    const macPaths = ['/usr/local/bin/python3', '/opt/homebrew/bin/python3'];
    for (const mp of macPaths) {
        if (existsSync(mp) && checkPythonHasMorphy(mp)) return mp;
    }

    const linuxPaths = ['/usr/bin/python3', '/usr/local/bin/python3'];
    for (const lp of linuxPaths) {
        if (existsSync(lp) && checkPythonHasMorphy(lp)) return lp;
    }

    return null;
}

// ✅ Paths for bundled stuff
export function getMorphyScriptPath() {
    return path.join(resolveAssetsPath('assets', 'python'), 'morphy.py');
}
export function getInstallerPath() {
    const base = resolveAssetsPath('assets', 'python', 'installer');
    if (process.platform === 'win32') return path.join(base, 'python-3.8.8-amd64.exe');
    if (process.platform === 'darwin') return path.join(base, 'python-3.13.5-macos11.pkg');
    return null;
}

// ✅ Install pymorphy3 wheels → fallback online
export async function installMorphyPackages(pythonPath: string): Promise<boolean> {
    const pkgDir = resolveAssetsPath('assets', 'python', 'packages');
    const wheels = [
        'pymorphy3-2.0.4-py3-none-any.whl',
        'pymorphy3_dicts_uk-2.4.1.1.1663094765-py2.py3-none-any.whl',
    ];

    spawnSync(pythonPath, ['-m', 'ensurepip', '--default-pip'], { stdio: 'inherit' });
    spawnSync(pythonPath, ['-m', 'pip', 'install', '--upgrade', 'pip', 'wheel'], {
        stdio: 'inherit',
    });

    let offlineOK = true;
    for (const w of wheels) {
        const wheelPath = path.join(pkgDir, w);
        if (!existsSync(wheelPath)) {
            offlineOK = false;
            continue;
        }
        const res = spawnSync(
            pythonPath,
            ['-m', 'pip', 'install', '--no-index', '--find-links', pkgDir, wheelPath],
            { stdio: 'inherit' },
        );
        if (res.status !== 0) offlineOK = false;
    }

    if (offlineOK) return true;

    if (await hasInternet()) {
        const res = spawnSync(
            pythonPath,
            ['-m', 'pip', 'install', '--upgrade', 'pymorphy3', 'pymorphy3-dicts-uk'],
            { stdio: 'inherit' },
        );
        return res.status === 0;
    }

    console.error('❌ Cannot install pymorphy3 (no wheels, no internet)');
    return false;
}

// ✅ Install Python (online → offline fallback)
export async function installPythonIfNeeded(): Promise<string | null> {
    let python = findSystemPython();
    if (python) return python;

    const installerPath = getInstallerPath();
    const tmpDir = os.tmpdir();
    const url =
        process.platform === 'win32'
            ? 'https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe'
            : 'https://www.python.org/ftp/python/3.11.8/python-3.11.8-macos11.pkg';
    const tmpInstaller = path.join(
        tmpDir,
        process.platform === 'win32' ? 'py-latest.exe' : 'py.pkg',
    );

    if (await hasInternet()) {
        console.log('🌐 Downloading Python installer...');
        await new Promise<void>((resolve, reject) => {
            const file = fs.createWriteStream(tmpInstaller);
            https
                .get(url, (res) => {
                    if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
                    res.pipe(file);
                    file.on('finish', () => file.close(() => resolve()));
                })
                .on('error', reject);
        });

        if (process.platform === 'win32') {
            spawnSync(tmpInstaller, ['/quiet', 'InstallAllUsers=1', 'PrependPath=1'], {
                stdio: 'inherit',
            });
        } else {
            await shell.openPath(tmpInstaller);
            return null; // macOS requires manual install
        }

        python = findSystemPython();
        if (python) return python;
    }

    // fallback offline
    if (installerPath && existsSync(installerPath)) {
        if (process.platform === 'win32') {
            spawnSync(installerPath, ['/quiet', 'InstallAllUsers=1', 'PrependPath=1'], {
                stdio: 'inherit',
            });
            return findSystemPython();
        } else {
            await shell.openPath(installerPath);
            return null;
        }
    }

    dialog.showErrorBox('Python missing', 'No internet & no offline installer.');
    return null;
}

// ✅ Full env init in one call
export async function initPythonEnvSimplified(): Promise<{
    python: string | null;
    script: string;
}> {
    console.log('🔄 Checking Python & pymorphy3...');
    let python = findSystemPython();

    // 1) If no Python at all → install
    if (!python) {
        console.warn('⚠️ No Python detected → installing...');
        python = await installPythonIfNeeded();
    }

    if (!python) {
        console.error('❌ Still no Python, aborting.');
        return { python: null, script: getMorphyScriptPath() };
    }

    // 2) Python exists, check pymorphy3
    if (!checkPythonHasMorphy(python)) {
        console.warn('⚠️ pymorphy3 missing → installing...');
        const ok = await installMorphyPackages(python);
        if (!ok) console.warn('⚠️ pymorphy3 installation failed, continuing without it.');
    }

    console.log('✅ Python ready:', python);
    return { python, script: getMorphyScriptPath() };
}
