import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Uninstaller } from './Uninstaller';

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
const dirs: string[] = [];

function programDir(withUninstaller: boolean): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pma-program-'));
    dirs.push(dir);
    fs.writeFileSync(path.join(dir, 'PManager.exe'), '');
    if (withUninstaller) fs.writeFileSync(path.join(dir, 'Uninstall PManager.exe'), '');
    return dir;
}

afterEach(() => {
    vi.useRealTimers();
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('Uninstaller', () => {
    it('runs the installed uninstaller silently, deleting the data folder, then closes', () => {
        vi.useFakeTimers();
        const dir = programDir(true);
        const launch = vi.fn();
        const exit = vi.fn();
        const uninstaller = new Uninstaller(silentLogger, {
            packaged: () => true,
            programDir: () => dir,
            exit,
            platform: 'win32',
            launch,
        });

        expect(uninstaller.available()).toBe(true);
        uninstaller.start();
        expect(launch).toHaveBeenCalledWith(path.join(dir, 'Uninstall PManager.exe'), [
            '/S',
            '--delete-app-data',
        ]);
        expect(exit).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1000);
        expect(exit).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['a development run', { packaged: false, platform: 'win32', uninstaller: true }],
        ['another system', { packaged: true, platform: 'linux', uninstaller: true }],
        [
            'a copy without the uninstaller',
            { packaged: true, platform: 'win32', uninstaller: false },
        ],
    ] as const)('is not offered in %s', (_name, setup) => {
        const launch = vi.fn();
        const uninstaller = new Uninstaller(silentLogger, {
            packaged: () => setup.packaged,
            programDir: () => programDir(setup.uninstaller),
            exit: vi.fn(),
            platform: setup.platform,
            launch,
        });
        expect(uninstaller.available()).toBe(false);
        expect(() => uninstaller.start()).toThrow();
        expect(launch).not.toHaveBeenCalled();
    });
});
