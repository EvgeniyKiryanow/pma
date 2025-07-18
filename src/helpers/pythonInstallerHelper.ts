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
        const cmd = process.platform === 'win32' ? 'where' : 'which';

        // Try python3 first
        let output = execFileSync(cmd, ['python3'], { encoding: 'utf8' })
            .split(/\r?\n/)
            .find((line) => line.trim() !== '');
        if (output && existsSync(output.trim())) return output.trim();

        // Try python
        output = execFileSync(cmd, ['python'], { encoding: 'utf8' })
            .split(/\r?\n/)
            .find((line) => line.trim() !== '');
        if (output && existsSync(output.trim())) return output.trim();
    } catch (_) {
        // no python on PATH
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
        // 1️⃣ Check pip
        console.log('🔍 Checking pip availability...');
        try {
            execFileSync(pythonPath, ['-m', 'pip', '--version'], { stdio: 'inherit' });
        } catch (_) {
            console.log('⚠ pip missing. Bootstrapping ensurepip...');
            try {
                execFileSync(pythonPath, ['-m', 'ensurepip', '--default-pip'], {
                    stdio: 'inherit',
                });
            } catch (e) {
                console.warn('⚠ ensurepip failed. Trying get-pip.py fallback...');
                const getPipPath = resolveAssetsPath('assets', 'python', 'get-pip.py');
                if (existsSync(getPipPath)) {
                    console.log('📥 Running get-pip.py...');
                    execFileSync(pythonPath, [getPipPath], { stdio: 'inherit' });
                }
            }
        }

        // 2️⃣ Optional: upgrade pip (but safe)
        try {
            execFileSync(pythonPath, ['-m', 'pip', 'install', '--upgrade', 'pip'], {
                stdio: 'inherit',
            });
        } catch (e) {
            console.warn('⚠ Could not upgrade pip:', e);
        }

        console.log('✅ pip ready. Installing offline wheels...');

        // 3️⃣ Install each wheel with --user to avoid admin issues
        for (const w of wheels) {
            const wheelPath = path.join(pkgDir, w);
            if (!existsSync(wheelPath)) {
                console.error('❌ Wheel not found:', wheelPath);
                continue;
            }

            console.log('📦 Installing wheel:', wheelPath);
            execFileSync(
                pythonPath,
                ['-m', 'pip', 'install', '--user', '--no-index', '--find-links', pkgDir, wheelPath],
                { stdio: 'inherit' },
            );
        }

        // 4️⃣ Verify
        console.log('✅ Verifying pymorphy3 import...');
        execFileSync(pythonPath, ['-c', 'import pymorphy3; print("✅ pymorphy3 import OK")'], {
            stdio: 'inherit',
        });

        console.log('🎉 pymorphy3 packages installed successfully!');
    } catch (e) {
        console.error('❌ Failed to install pymorphy3 packages', e);
    }
}
