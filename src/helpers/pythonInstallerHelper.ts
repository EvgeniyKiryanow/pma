import { existsSync } from 'fs';
import path from 'path';
import { shell, dialog, app } from 'electron';
import { execFileSync } from 'child_process';
import https from 'https';

// ✅ Always resolve paths correctly in packaged/unpacked mode
function resolveAssetsPath(...segments: string[]) {
    return app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', ...segments)
        : path.join(__dirname, ...segments);
}

// ✅ Detect system python (Windows + macOS/Linux)
function findSystemPython(): string | null {
    try {
        if (process.platform === 'win32') {
            // Common Python locations on Windows
            const possiblePaths = [
                path.join(
                    process.env.LOCALAPPDATA || '',
                    'Programs',
                    'Python',
                    'Python38',
                    'python.exe',
                ),
                path.join(
                    process.env.LOCALAPPDATA || '',
                    'Programs',
                    'Python',
                    'Python39',
                    'python.exe',
                ),
                'C:\\Python38\\python.exe',
                'C:\\Python39\\python.exe',
            ];
            for (const p of possiblePaths) {
                if (existsSync(p)) return p;
            }
        }

        const whichCmd = process.platform === 'win32' ? 'where' : 'which';

        // Try `python`
        const output = execFileSync(whichCmd, ['python'], { encoding: 'utf8' }).split(/\r?\n/)[0];
        if (output && existsSync(output)) return output;

        // Try `python3`
        const output3 = execFileSync(whichCmd, ['python3'], { encoding: 'utf8' }).split(/\r?\n/)[0];
        if (output3 && existsSync(output3)) return output3;
    } catch (_) {
        /* no python found */
    }
    return null;
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

// ✅ Prompt to install python if missing (unchanged)
export function promptInstallPython(): string | null {
    const installerPath = getInstallerPath();

    if (installerPath && existsSync(installerPath)) {
        shell.openPath(installerPath).then(() => {
            console.log('📦 Запущено інсталятор Python:', installerPath);
        });
        return installerPath;
    } else {
        dialog.showErrorBox(
            'Інсталятор не знайдено',
            'Файл інсталяції Python не знайдено для цієї платформи.',
        );
        return null;
    }
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

// ✅ Install pymorphy3 packages (improved logic but SAME name)
export async function installMorphyPackages(pythonPath: string) {
    const pkgDir = resolveAssetsPath('assets', 'python', 'packages');

    const wheels = [
        'pymorphy3-2.0.4-py3-none-any.whl',
        'pymorphy3_dicts_uk-2.4.1.1.1663094765-py2.py3-none-any.whl',
    ];

    try {
        console.log('🔍 Ensuring pip exists...');
        try {
            execFileSync(pythonPath, ['-m', 'ensurepip'], { stdio: 'inherit' });
        } catch (_) {
            console.warn('⚠️ ensurepip failed (maybe pip already exists)');
        }

        console.log('🔄 Upgrading pip...');
        try {
            execFileSync(
                pythonPath,
                ['-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel'],
                { stdio: 'inherit' },
            );
        } catch (e) {
            console.warn('⚠️ pip upgrade failed, continuing...', e);
        }

        // ✅ Check internet
        const online = await hasInternet();

        if (online) {
            console.log('🌐 Internet detected → installing from PyPI...');
            try {
                execFileSync(
                    pythonPath,
                    ['-m', 'pip', 'install', 'pymorphy3', 'pymorphy3-dicts-uk'],
                    { stdio: 'inherit' },
                );
                console.log('✅ Installed pymorphy3 & dicts from PyPI');
                return;
            } catch (err) {
                console.error('❌ Failed PyPI install, will fallback offline', err);
            }
        } else {
            console.warn('⚠️ No internet detected → fallback to offline wheels');
        }

        // ✅ Offline fallback
        console.log('📦 Installing offline wheels...');
        for (const wheel of wheels) {
            const wheelPath = path.resolve(pkgDir, wheel);
            if (!existsSync(wheelPath)) {
                console.warn(`⚠️ Missing wheel: ${wheelPath}`);
                continue;
            }

            console.log(`📦 Installing wheel: ${wheelPath}`);
            try {
                execFileSync(pythonPath, ['-m', 'pip', 'install', wheelPath], {
                    stdio: 'inherit',
                });
                console.log(`✅ Installed offline: ${wheel}`);
            } catch (err) {
                console.error(`❌ Failed installing ${wheel} offline`, err);
            }
        }

        console.log('🎉 pymorphy3 installation finished');
    } catch (e) {
        console.error('❌ Global failure installing pymorphy3', e);
    }
}
