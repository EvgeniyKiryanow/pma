/**
 * Starts the built app in Electron without a window (`--smoke-test`) and checks that it
 * boots on this system: native modules load, the database opens and every migration runs —
 * on an empty data folder and on a database from an old release (fixtures/db).
 *
 *   npm run build && npm run smoke
 *
 * Linux CI needs a display: `xvfb-run -a npm run smoke`.
 * 32-bit Windows (after scripts/prepare-ia32.mjs): `npm run smoke -- --arch=ia32` downloads
 * the 32-bit Electron and starts the app in it.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arch = process.argv.find((arg) => arg.startsWith('--arch='))?.slice('--arch='.length);
const electron =
    arch && arch !== process.arch ? await electronFor(arch) : (await import('electron')).default;
const fixtures = path.join(root, 'fixtures', 'db');
const oldest = fs.readdirSync(fixtures).filter((f) => f.endsWith('.sqlite')).sort()[0];

const scenarios = [
    { name: 'empty data folder', database: null },
    { name: `upgrade of ${oldest}`, database: path.join(fixtures, oldest) },
];

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE; // set by some IDEs; Electron would start as plain Node
const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pma-smoke-'));
let failed = false;

try {
    for (const scenario of scenarios) {
        const dataDir = path.join(workRoot, String(scenarios.indexOf(scenario)));
        fs.mkdirSync(dataDir, { recursive: true });
        if (scenario.database) fs.copyFileSync(scenario.database, path.join(dataDir, 'users.db'));

        const run = spawnSync(electron, [root, '--smoke-test'], {
            env: { ...env, PMA_USER_DATA_DIR: dataDir },
            encoding: 'utf8',
            timeout: 120_000,
        });
        const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
        const line = output.split(/\r?\n/).find((l) => l.startsWith('SMOKE_TEST_RESULT '));
        if (run.status !== 0 || !line) {
            failed = true;
            console.error(`✗ ${scenario.name} (exit ${run.status ?? run.signal})\n${output}`);
            continue;
        }
        const result = JSON.parse(line.slice('SMOKE_TEST_RESULT '.length));
        console.log(
            `✓ ${scenario.name}: schema v${result.schemaVersion}, ` +
                `${result.personnel?.n ?? 0} people, ${result.roles?.length ?? 0} roles`,
        );
    }
} finally {
    fs.rmSync(workRoot, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);

/** Electron of another architecture (same version), unpacked once into the temp folder. */
async function electronFor(targetArch) {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const version = require('electron/package.json').version;
    const dir = path.join(os.tmpdir(), `pma-electron-${version}-${process.platform}-${targetArch}`);
    const binary = path.join(dir, process.platform === 'win32' ? 'electron.exe' : 'electron');
    if (!fs.existsSync(binary)) {
        const { downloadArtifact } = require('@electron/get');
        const zip = await downloadArtifact({
            version,
            artifactName: 'electron',
            platform: process.platform,
            arch: targetArch,
        });
        fs.mkdirSync(dir, { recursive: true });
        // Windows' bsdtar reads zip files (extract-zip hangs on current Node versions).
        const unpack =
            process.platform === 'win32'
                ? spawnSync(path.join(process.env.SystemRoot, 'System32', 'tar.exe'), ['-xf', zip, '-C', dir])
                : spawnSync('unzip', ['-q', '-o', zip, '-d', dir]);
        if (unpack.status !== 0) throw new Error(`Cannot unpack ${zip}: ${unpack.stderr}`);
    }
    console.log(`Electron ${version} ${targetArch}: ${binary}`);
    return binary;
}
