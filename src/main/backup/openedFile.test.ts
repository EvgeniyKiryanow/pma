import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

import { OpenedBackupFile } from './openedFile';

function tempFile(name: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pma-opened-'));
    const file = path.join(dir, name);
    fs.writeFileSync(file, 'PMB2');
    return file;
}

describe('OpenedBackupFile', () => {
    it('takes a .pmb file from the command line once, and tells who listens', () => {
        const file = tempFile('Копія роти.PMB');
        const opened = new OpenedBackupFile();
        const listener = vi.fn();
        opened.onOffered(listener);

        expect(opened.offer(['C:\\Program Files\\PManager.exe', '--flag', file])).toBe(true);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(opened.name()).toBe('Копія роти.PMB');
        expect(opened.take()).toBe(file);
        expect(opened.take()).toBeNull();
        expect(opened.name()).toBeNull();
    });

    it('ignores anything that is not an existing .pmb file', () => {
        const opened = new OpenedBackupFile();
        const other = tempFile('notes.txt');
        expect(
            opened.offer([
                other,
                'relative\\copy.pmb',
                path.join(os.tmpdir(), 'missing-copy.pmb'),
                '--open=copy.pmb',
                path.dirname(other),
            ]),
        ).toBe(false);
        expect(opened.name()).toBeNull();
    });
});
