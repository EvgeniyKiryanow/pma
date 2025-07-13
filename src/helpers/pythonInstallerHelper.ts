// src/helpers/pythonInstallerHelper.ts

import { existsSync } from 'fs';
import path from 'path';
import { shell, dialog, app } from 'electron';
import { execFileSync } from 'child_process';

export function installMorphyPackages(pythonPath: string) {
    const pkgDir = app.isPackaged
        ? path.join(process.resourcesPath, 'assets', 'python', 'packages')
        : path.join(__dirname, 'assets/python/packages');

    const wheels = [
        'pymorphy3-2.0.4-py3-none-any.whl',
        'pymorphy3_dicts_uk-2.4.1.1.1663094765-py2.py3-none-any.whl',
    ];
    try {
        wheels.forEach((w) => {
            execFileSync(pythonPath, ['-m', 'pip', 'install', path.join(pkgDir, w)]);
        });
        console.log('✅ pymorphy3 packages installed');
    } catch (e) {
        console.error('❌ Failed to install pymorphy3 packages', e);
    }
}

export function getPythonPaths(): { python: string; script: string } {
    const base = app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'python')
        : path.join(__dirname, 'assets/python');

    const script = path.join(base, 'morphy.py');

    const python = getInstalledPythonPath();
    return { python, script };
}

export function getInstallerPath() {
    // Update python
    const base = app.isPackaged
        ? path.join(process.resourcesPath, 'assets/python/installer')
        : path.join(__dirname, 'assets/python/installer');

    if (process.platform === 'win32') {
        return path.join(base, 'python-3.8.8-amd64.exe');
    }
    if (process.platform === 'darwin') {
        return path.join(base, 'python-3.13.5-macos11.pkg');
    }

    return null;
}

export function isPythonAvailable(pythonPath: string): boolean {
    return existsSync(pythonPath);
}

export function promptInstallPython(): string | null {
    const installerPath = getInstallerPath();

    // python did not installed update on windows
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

export function getInstalledPythonPath(): string {
    const base = app.isPackaged
        ? path.join(process.resourcesPath, 'assets/python/installer')
        : path.join(__dirname, 'assets/python/installer');

    if (process.platform === 'win32') {
        return path.join(base, 'python-3.8.8-amd64.exe');
    }

    if (process.platform === 'darwin') {
        return '/usr/local/bin/python3'; // Or detect system-installed path
    }

    if (process.platform === 'linux') {
        return '/usr/bin/python3'; // Or your bundled location
    }

    throw new Error('Unsupported platform');
}
