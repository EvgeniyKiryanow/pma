/**
 * electron-builder `afterPack` hook: fails the build when the packaged app would not start
 * on the target system — a missing bundle, a runtime dependency left out, or no native
 * binary for the target platform/architecture. Runs for every package (local and CI),
 * before installers are made or anything is published.
 */
const fs = require('fs');
const { builtinModules } = require('module');
const path = require('path');
const asar = require('@electron/asar');
const { Arch } = require('builder-util');

module.exports = async function verifyPackage(context) {
    const platform = context.electronPlatformName; // win32 | darwin | linux
    const arch = Arch[context.arch]; // x64 | arm64 | ...
    const resources =
        platform === 'darwin'
            ? path.join(
                  context.appOutDir,
                  `${context.packager.appInfo.productFilename}.app`,
                  'Contents',
                  'Resources',
              )
            : path.join(context.appOutDir, 'resources');

    const archive = path.join(resources, 'app.asar');
    const unpacked = path.join(resources, 'app.asar.unpacked');
    const packed = new Set(
        asar.listPackage(archive, { isPack: false }).map((entry) => entry.replace(/\\/g, '/')),
    );
    const inArchive = (file) => packed.has(`/${file}`);
    const isUnpacked = (file) => fs.existsSync(path.join(unpacked, file));
    const problems = [];
    const expect = (condition, message) => condition || problems.push(message);

    // The app itself.
    for (const file of [
        '.vite/build/main.js',
        '.vite/build/preload.js',
        'renderer_dist/index.html',
        'package.json',
    ]) {
        expect(inArchive(file), `missing ${file}`);
    }
    expect(
        ![...packed].some((file) => /^\/(\.vite|renderer_dist)\/.*\.map$/.test(file)),
        'source maps of the app must not be shipped',
    );

    // Every package the bundles load at run time. Vite leaves node_modules imports external,
    // and electron-builder packages only "dependencies": an import of a devDependency from
    // the main process would build fine and crash on start.
    for (const bundle of ['.vite/build/main.js', '.vite/build/preload.js']) {
        if (!inArchive(bundle)) continue;
        const code = asar.extractFile(archive, path.normalize(bundle)).toString('utf8');
        for (const [, request] of code.matchAll(/require\("([^"./][^"]*)"\)/g)) {
            if (request === 'electron' || builtinModules.includes(request.replace(/^node:/, '')))
                continue;
            const name = request.startsWith('@')
                ? request.split('/').slice(0, 2).join('/')
                : request.split('/')[0];
            expect(
                inArchive(`node_modules/${name}/package.json`),
                `${bundle} requires ${name}, which is not packaged (move it to "dependencies")`,
            );
        }
    }

    // SQLite driver: the binary for this system, unpacked (Node cannot load it from asar),
    // and no binaries of other systems.
    const driver = 'node_modules/better-sqlite3-multiple-ciphers/prebuilds';
    const compiled = 'node_modules/better-sqlite3-multiple-ciphers/build/Release/better_sqlite3.node';
    const binary = `${platform}-${arch}.node`;
    if (COMPILED_DRIVER.has(`${platform}-${arch}`)) {
        // No prebuilt binary for this system: scripts/prepare-ia32.mjs compiled one.
        expect(isUnpacked(compiled), `compiled SQLite driver is missing (run scripts/prepare-ia32.mjs)`);
        if (isUnpacked(compiled)) {
            const machine = peMachine(path.join(unpacked, compiled));
            expect(machine === PE_MACHINE[arch], `compiled SQLite driver is not ${arch} (${machine})`);
        }
    } else {
        expect(isUnpacked(`${driver}/${binary}`), `SQLite driver binary ${binary} is missing`);
        expect(
            !isUnpacked(compiled) && !inArchive(compiled),
            `a compiled driver from another build is packaged: delete ${compiled.replace(/\/better_sqlite3.node$/, '')}`,
        );
    }
    const shipped = [
        ...packed,
        ...listFiles(path.join(unpacked, driver)).map((file) => `/${driver}/${file}`),
    ]
        .filter((file) => file.startsWith(`/${driver}/`) && file.endsWith('.node'))
        .map((file) => path.posix.basename(file));
    const foreign = [...new Set(shipped)].filter((file) => file !== binary);
    // (For a compiled driver no prebuilt binary is expected at all.)
    expect(!foreign.length, `binaries of other systems are packaged: ${foreign.join(', ')}`);

    const koffiBinaries = listFiles(path.join(unpacked, 'node_modules', '@koromix'));
    const otherKoffi = koffiBinaries.filter((name) => name !== `koffi-${platform}-${arch}`);
    expect(!otherKoffi.length, `koffi binaries of other systems are packaged: ${otherKoffi.join(', ')}`);

    // Windows only: DPAPI and the private clipboard go through koffi.
    if (platform === 'win32') {
        const koffi = `node_modules/@koromix/koffi-win32-${arch}/win32_${arch}/koffi.node`;
        expect(isUnpacked(koffi), `koffi binary for win32-${arch} is missing`);
    }

    // Document templates are copied out of the app on first start.
    const templates = listFiles(path.join(unpacked, 'assets', 'templates'));
    expect(templates.length > 0, 'document templates are not unpacked');

    if (problems.length) {
        throw new Error(
            `Package check failed for ${platform}-${arch}:\n  - ${problems.join('\n  - ')}`,
        );
    }
    console.log(`  • package check passed  platform=${platform} arch=${arch}`);
};

/** Systems whose SQLite driver is compiled here because the package has no prebuilt one. */
const COMPILED_DRIVER = new Set(['win32-ia32']);
const PE_MACHINE = { ia32: 'x86', x64: 'x64', arm64: 'arm64' };

/** CPU a Windows DLL (.node) was built for, read from its PE header. */
function peMachine(file) {
    const bytes = fs.readFileSync(file);
    const pe = bytes.readUInt32LE(0x3c);
    const code = bytes.readUInt16LE(pe + 4);
    return { 0x14c: 'x86', 0x8664: 'x64', 0xaa64: 'arm64' }[code] ?? `0x${code.toString(16)}`;
}

function listFiles(dir) {
    return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
}
