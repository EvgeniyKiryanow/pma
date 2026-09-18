import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { shred } from './fsUtils';

let dir: string;

beforeEach(async () => {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-shred-'));
});

afterEach(async () => {
    await fsp.rm(dir, { recursive: true, force: true });
});

describe('shred', () => {
    it('overwrites the content before deleting, so the bytes are gone from the disk blocks', async () => {
        const file = path.join(dir, 'data', 'users.db');
        await fsp.mkdir(path.dirname(file), { recursive: true });
        await fsp.writeFile(file, 'Шевченко Тарас, паспорт АА 123456');
        // A second name for the same file data: it still points at the blocks after deletion.
        const witness = path.join(dir, 'witness.db');
        fs.linkSync(file, witness);

        const result = await shred(path.join(dir, 'data'));

        expect(result.files).toBe(1);
        expect(fs.existsSync(path.join(dir, 'data'))).toBe(false);
        const left = await fsp.readFile(witness);
        expect(left.length).toBeGreaterThan(0);
        expect(left.every((byte) => byte === 0)).toBe(true);
    });

    it('handles nested folders, empty files and a missing path', async () => {
        await fsp.mkdir(path.join(dir, 'a', 'b'), { recursive: true });
        await fsp.writeFile(path.join(dir, 'a', 'b', 'x.pdf'), 'x'.repeat(3 * 1024 * 1024));
        await fsp.writeFile(path.join(dir, 'a', 'empty.txt'), '');

        expect(await shred(path.join(dir, 'a'))).toEqual({ files: 2, bytes: 3 * 1024 * 1024 });
        expect(fs.existsSync(path.join(dir, 'a'))).toBe(false);
        expect(await shred(path.join(dir, 'missing'))).toEqual({ files: 0, bytes: 0 });
    });
});
