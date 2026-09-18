import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ArchiveWriter, extractEntry, readArchiveIndex, readEntry } from './archive';

let dir: string;
const file = (name: string) => path.join(dir, name);

beforeAll(async () => {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-archive-'));
});

afterAll(async () => {
    await fsp.rm(dir, { recursive: true, force: true });
});

describe('archive container', () => {
    it('stores buffers and files and reads them back', async () => {
        const source = file('users.db');
        const payload = Buffer.alloc(300_000, 7);
        await fsp.writeFile(source, payload);

        const archive = file('a.bin');
        const writer = new ArchiveWriter(archive);
        await writer.open();
        await writer.addBuffer('manifest.json', Buffer.from('{"formatVersion":2}'));
        await writer.addFile('database/users.db', source);
        const summary = await writer.close();

        expect(summary.entries).toBe(2);
        expect(summary.bytes).toBe(19 + payload.length);

        const entries = await readArchiveIndex(archive);
        expect(entries.map((e) => e.path)).toEqual(['manifest.json', 'database/users.db']);
        expect((await readEntry(archive, entries[0])).toString()).toBe('{"formatVersion":2}');

        await extractEntry(archive, entries[1], file('out/users.db'));
        expect(await fsp.readFile(file('out/users.db'))).toEqual(payload);
    });

    it('stores a whole directory tree with forward-slash paths', async () => {
        await fsp.mkdir(file('files/1/77'), { recursive: true });
        await fsp.writeFile(file('files/1/77/наказ.txt'), 'вміст');
        await fsp.writeFile(file('files/root.txt'), 'корінь');

        const archive = file('tree.bin');
        const writer = new ArchiveWriter(archive);
        await writer.open();
        await writer.addDirectory('files/history_files', file('files'));
        await writer.close();

        const entries = await readArchiveIndex(archive);
        expect(entries.map((e) => e.path).sort()).toEqual([
            'files/history_files/1/77/наказ.txt',
            'files/history_files/root.txt',
        ]);
    });

    it('keeps empty files', async () => {
        await fsp.writeFile(file('empty.txt'), '');
        const archive = file('empty.bin');
        const writer = new ArchiveWriter(archive);
        await writer.open();
        await writer.addFile('empty.txt', file('empty.txt'));
        await writer.close();

        const [entry] = await readArchiveIndex(archive);
        expect(entry.size).toBe(0);
        await extractEntry(archive, entry, file('out-empty.txt'));
        expect((await fsp.readFile(file('out-empty.txt'))).length).toBe(0);
    });

    it('refuses entry paths that would escape the target folder', async () => {
        const writer = new ArchiveWriter(file('bad.bin'));
        await writer.open();
        await expect(writer.addBuffer('../escape.txt', Buffer.from('x'))).rejects.toMatchObject({
            code: 'CORRUPTED',
        });
        await expect(writer.addBuffer('/absolute.txt', Buffer.from('x'))).rejects.toMatchObject({
            code: 'CORRUPTED',
        });
        await expect(
            writer.addBuffer('C:\\windows\\x.txt', Buffer.from('x')),
        ).rejects.toMatchObject({
            code: 'CORRUPTED',
        });
        await writer.close();
    });

    it('rejects a file that is not an archive', async () => {
        await fsp.writeFile(file('junk.bin'), Buffer.alloc(64, 1));
        await expect(readArchiveIndex(file('junk.bin'))).rejects.toMatchObject({
            code: 'UNSUPPORTED_FORMAT',
        });
    });

    it('rejects a truncated archive', async () => {
        const archive = file('cut.bin');
        const writer = new ArchiveWriter(archive);
        await writer.open();
        await writer.addBuffer('a.txt', Buffer.alloc(1000, 3));
        await writer.close();

        const bytes = await fsp.readFile(archive);
        await fsp.writeFile(archive, bytes.subarray(0, bytes.length - 200));
        await expect(readArchiveIndex(archive)).rejects.toMatchObject({ code: 'CORRUPTED' });
    });
});
