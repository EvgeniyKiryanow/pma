import { existsSync } from 'fs';
import path from 'path';
import { shell, dialog, app } from 'electron';
import { execFileSync } from 'child_process';

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
            // Standard Python installer on Windows
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
        const output = execFileSync(whichCmd, ['python'], { encoding: 'utf8' }).split(/\r?\n/)[0];
        if (output && existsSync(output)) return output;

        const output3 = execFileSync(whichCmd, ['python3'], { encoding: 'utf8' }).split(/\r?\n/)[0];
        if (output3 && existsSync(output3)) return output3;
    } catch (_) {
        /* empty */
    }
    return null;
}

// ✅ Get python exe + morphy.py path
export function getPythonPaths(): { python: string; script: string } {
    const base = resolveAssetsPath('assets', 'python');
    const script = path.join(base, 'morphy.py');

    // Prefer system python
    let python = getInstalledPythonPath();

    // Fallback → embedded python.exe (if you ship it)
    const embeddedPython = path.join(base, 'python.exe');
    if (!python && existsSync(embeddedPython)) {
        python = embeddedPython;
    }

    console.log('📂 Python base dir:', base);
    console.log('🐍 Script path:', script);
    console.log('🐍 Python executable:', python ?? 'NOT FOUND');

    return { python: python ?? '', script };
}

// ✅ Original name kept, but now uses new robust detection
export function getInstalledPythonPath(): string | null {
    const systemPython = findSystemPython();
    if (systemPython) return systemPython;
    return null; // nothing found → will trigger promptInstallPython
}

// ✅ Check if python binary exists
export function isPythonAvailable(pythonPath: string): boolean {
    return pythonPath !== '' && existsSync(pythonPath);
}

// ✅ Offline installer path (keeps same name)
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

// ✅ Prompt to install python if missing (keeps same name)
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

// ✅ Install pymorphy3 packages offline (same name but fixed logic)
export function installMorphyPackages(pythonPath: string) {
    const pkgDir = resolveAssetsPath('assets', 'python', 'packages');

    const wheels = [
        'pymorphy3-2.0.4-py3-none-any.whl',
        'pymorphy3_dicts_uk-2.4.1.1.1663094765-py2.py3-none-any.whl',
    ];

    try {
        console.log('🔍 Ensuring pip exists...');
        execFileSync(pythonPath, ['-m', 'ensurepip'], { stdio: 'inherit' });

        console.log('🔄 Upgrading pip...');
        execFileSync(
            pythonPath,
            ['-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel'],
            {
                stdio: 'inherit',
            },
        );

        console.log('✅ pip ready, installing offline wheels one by one...');

        for (const wheel of wheels) {
            const wheelPath = path.resolve(pkgDir, wheel);
            if (!existsSync(wheelPath)) {
                console.warn(`⚠️ Wheel missing: ${wheelPath}`);
                continue;
            }

            console.log(`📦 Installing wheel: ${wheelPath}`);
            try {
                // ✅ Direct path install (no --find-links, simpler for Windows)
                execFileSync(pythonPath, ['-m', 'pip', 'install', wheelPath], { stdio: 'inherit' });
                console.log(`✅ Installed: ${wheel}`);
            } catch (err) {
                console.error(`❌ Failed installing ${wheelPath}`, err);

                // ✅ Fallback → PyPI
                const pkgName = wheel.startsWith('pymorphy3_dicts_uk')
                    ? 'pymorphy3-dicts-uk'
                    : 'pymorphy3';
                console.log(`🌐 Trying PyPI: ${pkgName}`);
                execFileSync(pythonPath, ['-m', 'pip', 'install', pkgName], { stdio: 'inherit' });
            }
        }

        console.log('🎉 pymorphy3 packages installed');
    } catch (e) {
        console.error('❌ Global failure installing pymorphy3', e);
    }
}

// it is not work  lib is not working
