import { existsSync } from 'fs';
import path from 'path';
import { shell, dialog, app } from 'electron';
import { execFileSync } from 'child_process';

// ✅ Helper to always point to unpacked folder in packaged mode
function resolveAssetsPath(...segments: string[]) {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'app.asar.unpacked', ...segments);
    } else {
        return path.join(__dirname, ...segments);
    }
}

// ✅ Install pymorphy3 wheels from unpacked assets
export function installMorphyPackages(pythonPath: string) {
    const pkgDir = resolveAssetsPath('assets', 'python', 'packages');

    const wheels = [
        'pymorphy3-2.0.4-py3-none-any.whl',
        'pymorphy3_dicts_uk-2.4.1.1.1663094765-py2.py3-none-any.whl',
    ];

    try {
        wheels.forEach((w) => {
            const wheelPath = path.join(pkgDir, w);
            console.log('📦 Installing wheel:', wheelPath);
            execFileSync(pythonPath, ['-m', 'pip', 'install', wheelPath], { stdio: 'inherit' });
        });
        console.log('✅ pymorphy3 packages installed');
    } catch (e) {
        console.error('❌ Failed to install pymorphy3 packages', e);
    }
}

// ✅ Get python exe + morphy.py path
export function getPythonPaths(): { python: string; script: string } {
    const base = resolveAssetsPath('assets', 'python');
    const script = path.join(base, 'morphy.py');

    // First try system python
    let python = findSystemPython();

    // Fallback: embedded python.exe you may ship
    const embeddedPython = path.join(base, 'python.exe');
    if (!python && existsSync(embeddedPython)) {
        python = embeddedPython;
    }

    console.log('📂 Python base dir:', base);
    console.log('🐍 Script path:', script);
    console.log('🐍 Python executable:', python ?? 'NOT FOUND');

    return { python: python ?? '', script };
}

// ✅ Get path to the offline installer for Windows/Mac
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

// ✅ Check if a given python.exe actually exists
export function isPythonAvailable(pythonPath: string): boolean {
    return pythonPath !== '' && existsSync(pythonPath);
}

// ✅ Show installer if python not available
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

// ✅ Get "installed" python path
// Previously this incorrectly returned the installer itself
export function getInstalledPythonPath(): string | null {
    // Try detecting globally installed python
    const systemPython = findSystemPython();
    if (systemPython) return systemPython;

    // If nothing → return null (force promptInstallPython())
    return null;
}

// ✅ Helper: detect system python3/python on PATH
function findSystemPython(): string | null {
    try {
        const whichCmd = process.platform === 'win32' ? 'where' : 'which';

        let output = execFileSync(whichCmd, ['python3'], { encoding: 'utf8' }).split(/\r?\n/)[0];
        if (output && existsSync(output)) return output;

        output = execFileSync(whichCmd, ['python'], { encoding: 'utf8' }).split(/\r?\n/)[0];
        if (output && existsSync(output)) return output;
    } catch (_) {
        // nothing found
    }
    return null;
}
