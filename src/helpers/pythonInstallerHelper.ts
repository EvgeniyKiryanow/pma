import { existsSync } from 'fs';
import path from 'path';
import { shell, dialog, app } from 'electron';
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

// ✅ Quick internet check
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
        } catch {
            resolve(false);
        }
    });
}

// ✅ Detect ANY Python (no pymorphy3 check)
function detectPlainPython(): string | null {
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
    if (py) return py;

    //Js bug the same

    if (process.platform === 'win32') {
        const dirs = [
            path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python'),
            'C:\\Python311',
            'C:\\Python310',
            'C:\\Python39',
            'C:\\Python38',
            'C:\\Python37',
        ];
        for (const base of dirs) {
            const pyExe = path.join(base, 'python.exe');
            if (existsSync(pyExe)) return pyExe;
        }
    }

    const macPaths = ['/usr/local/bin/python3', '/opt/homebrew/bin/python3'];
    for (const mp of macPaths) if (existsSync(mp)) return mp;
    const linuxPaths = ['/usr/bin/python3', '/usr/local/bin/python3'];
    for (const lp of linuxPaths) if (existsSync(lp)) return lp;

    return null;
}

// ✅ Check if pymorphy3 is installed for a given Python
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

// ✅ Download helper with progress
async function downloadPythonInstaller(url: string, dest: string): Promise<boolean> {
    console.log(`🌐 Downloading Python installer: ${url} → ${dest}`);
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https
            .get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                const total = parseInt(res.headers['content-length'] || '0', 10);
                let downloaded = 0;
                res.on('data', (chunk) => {
                    downloaded += chunk.length;
                    if (total > 0) {
                        const percent = ((downloaded / total) * 100).toFixed(1);
                        process.stdout.write(`\r⬇️  ${percent}% (${downloaded}/${total} bytes)`);
                    }
                });
                res.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`\n✅ Download complete (${downloaded} bytes)`);
                    resolve(true);
                });
            })
            .on('error', (err) => {
                console.error('❌ Download failed:', err.message);
                if (existsSync(dest)) fs.unlinkSync(dest);
                reject(err);
            });
    });
}

// ✅ Offline installer paths
function getInstallerPath() {
    const base = resolveAssetsPath('assets', 'python', 'installer');
    if (process.platform === 'win32') return path.join(base, 'python-3.8.8-amd64.exe');
    if (process.platform === 'darwin') return path.join(base, 'python-3.13.5-macos11.pkg');
    return null;
}
export function getMorphyScriptPath() {
    return path.join(resolveAssetsPath('assets', 'python'), 'morphy.py');
}

// ✅ Install Python (online first → offline fallback)
async function installPython(): Promise<string | null> {
    const installerPath = getInstallerPath();
    const tmpDir = os.tmpdir();
    const url =
        process.platform === 'win32'
            ? 'https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe'
            : 'https://www.python.org/ftp/python/3.11.8/python-3.11.8-macos11.pkg';
    const tmpInstaller = path.join(
        tmpDir,
        process.platform === 'win32' ? 'python311.exe' : 'python311.pkg',
    );

    const online = await hasInternet();
    if (online) {
        const ok = await downloadPythonInstaller(url, tmpInstaller);
        if (ok) {
            if (process.platform === 'win32') {
                console.log('📦 Running downloaded Python silent installer...');
                spawnSync(tmpInstaller, ['/quiet', 'InstallAllUsers=1', 'PrependPath=1'], {
                    stdio: 'inherit',
                });
                await new Promise((r) => setTimeout(r, 5000));
                const py = detectPlainPython();
                if (py) return py;
                console.warn('⚠️ Silent install failed → opening interactive');
                await shell.openPath(tmpInstaller);
                return null;
            } else {
                console.log('📦 macOS → opening interactive pkg');
                await shell.openPath(tmpInstaller);
                return null;
            }
        }
    }

    // fallback offline
    if (installerPath && existsSync(installerPath)) {
        console.log('📦 Using offline bundled installer...');
        if (process.platform === 'win32') {
            spawnSync(installerPath, ['/quiet', 'InstallAllUsers=1', 'PrependPath=1'], {
                stdio: 'inherit',
            });
            await new Promise((r) => setTimeout(r, 5000));
            const py = detectPlainPython();
            if (py) return py;
            console.warn('⚠️ Offline silent failed → opening interactive');
            await shell.openPath(installerPath);
            return null;
        } else {
            console.log('📦 macOS offline pkg → interactive');
            await shell.openPath(installerPath);
            return null;
        }
    }

    dialog.showErrorBox('Python missing', 'No internet & no offline installer available.');
    return null;
}

// ✅ Install pymorphy3 (offline wheels → PyPI if internet)
async function installMorphyPackages(pythonPath: string): Promise<boolean> {
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
        console.log('🌐 Installing pymorphy3 from PyPI...');
        const res = spawnSync(
            pythonPath,
            ['-m', 'pip', 'install', '--upgrade', 'pymorphy3', 'pymorphy3-dicts-uk'],
            { stdio: 'inherit' },
        );
        return res.status === 0;
    }

    console.error('❌ No internet & no offline wheels → pymorphy3 cannot be installed');
    return false;
}

// ✅ Main: full init
export async function initPythonEnvSimplified(): Promise<{
    python: string | null;
    script: string;
}> {
    console.log('🔄 Checking Python + pymorphy3...');

    let python = detectPlainPython();
    let hasMorphy = false;

    if (python) {
        hasMorphy = checkPythonHasMorphy(python);
    }

    // Case 1: Python & pymorphy3 already present → done
    if (python && hasMorphy) {
        console.log('✅ Found Python with pymorphy3:', python);
        return { python, script: getMorphyScriptPath() };
    }

    // Case 2: Python missing → install first
    if (!python) {
        console.warn('⚠️ No Python detected → installing...');
        python = await installPython();
    }

    if (!python) {
        console.error('❌ Python installation failed → cannot proceed.');
        return { python: null, script: getMorphyScriptPath() };
    }

    // Case 3: Python exists but pymorphy3 missing → install it
    if (!checkPythonHasMorphy(python)) {
        console.warn('⚠️ pymorphy3 missing → installing...');
        const ok = await installMorphyPackages(python);
        if (!ok)
            console.warn('⚠️ pymorphy3 installation failed (offline & online both unavailable)');
    }

    console.log('✅ Python ready at:', python);
    return { python, script: getMorphyScriptPath() };
}
