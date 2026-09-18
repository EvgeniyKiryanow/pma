/**
 * Native modules for the 32-bit Windows build (`npm run dist:win32`). Windows only, needs
 * Visual Studio 2022 with the C++ workload (GitHub's windows-2022 runner has it).
 *
 * - SQLite driver: ships no 32-bit binary, so it is compiled from the sources in its
 *   package, for Electron's Node-API. The driver loads build/Release/better_sqlite3.node
 *   when there is no prebuilt binary for the architecture.
 * - koffi: npm installs only the binary of the machine it runs on; the 32-bit one is added
 *   next to it (same version).
 *
 * The x64 build is not affected: it keeps using the prebuilt x64 binaries, and packaging
 * leaves the 32-bit files out (electron-builder.yml).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') {
    console.error('The 32-bit build is made on Windows only.');
    process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modules = path.join(root, 'node_modules');
const version = (name) =>
    JSON.parse(fs.readFileSync(path.join(modules, name, 'package.json'), 'utf8')).version;
const run = (command, args, cwd) =>
    execFileSync(command, args, { cwd, stdio: 'inherit', shell: true, env: process.env });

// koffi
const koffiPackage = `@koromix/koffi-win32-ia32@${version('koffi')}`;
const koffiTarget = path.join(modules, '@koromix', 'koffi-win32-ia32');
const download = fs.mkdtempSync(path.join(os.tmpdir(), 'pma-koffi-'));
try {
    run('npm', ['pack', koffiPackage, '--pack-destination', `"${download}"`], root);
    const tarball = fs.readdirSync(download).find((file) => file.endsWith('.tgz'));
    fs.rmSync(koffiTarget, { recursive: true, force: true });
    fs.mkdirSync(koffiTarget, { recursive: true });
    // Windows' own bsdtar: GNU tar (Git Bash) reads `C:` as a remote host.
    const tar = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
    run(
        `"${tar}"`,
        ['-xzf', `"${path.join(download, tarball)}"`, '--strip-components=1', '-C', `"${koffiTarget}"`],
        root,
    );
} finally {
    fs.rmSync(download, { recursive: true, force: true });
}
console.log(`koffi: ${koffiPackage} → ${path.relative(root, koffiTarget)}`);

// SQLite driver
const driver = path.join(modules, 'better-sqlite3-multiple-ciphers');
run(
    'npx',
    [
        '--yes',
        'node-gyp@11',
        'rebuild',
        '--release',
        '--arch=ia32',
        `--target=${version('electron')}`,
        '--dist-url=https://electronjs.org/headers',
        // The package skips compiling when the machine running the build (x64) has a
        // prebuilt binary; the target here is 32-bit.
        '--force_build=1',
    ],
    driver,
);
const binary = path.join(driver, 'build', 'Release', 'better_sqlite3.node');
if (!fs.existsSync(binary)) throw new Error(`Build finished without ${binary}`);
console.log(`SQLite driver: ${path.relative(root, binary)}`);
