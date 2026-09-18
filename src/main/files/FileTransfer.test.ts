import { dialog } from 'electron';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sessionManager } from '../auth/SessionManager';
import { dialogActivity } from '../core/dialogs';
import { ClipboardGuard } from './ClipboardGuard';
import { FileTransfer } from './FileTransfer';

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
const sender = { id: 1 } as never;

let dir: string;
let files: FileTransfer;

beforeEach(async () => {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-files-'));
    files = new FileTransfer(silentLogger);
});

afterEach(async () => {
    vi.restoreAllMocks();
    await fsp.rm(dir, { recursive: true, force: true });
});

describe('saving a file', () => {
    it('asks without adding to Windows recent items and writes the whole file', async () => {
        const target = path.join(dir, 'звіт.xlsx');
        const save = vi
            .spyOn(dialog, 'showSaveDialog')
            .mockResolvedValue({ canceled: false, filePath: target } as never);

        const result = await files.save(sender, 'звіт.xlsx', Buffer.from('таблиця'));

        expect(result).toEqual({ saved: true, fileName: 'звіт.xlsx' });
        expect(await fsp.readFile(target, 'utf8')).toBe('таблиця');
        expect(fs.existsSync(`${target}.partial`)).toBe(false);
        const options = save.mock.calls[0][0] as unknown as Electron.SaveDialogOptions;
        expect(options.properties).toContain('dontAddToRecent');
        expect(options.filters).toEqual([{ name: 'Таблиця Excel', extensions: ['xlsx'] }]);
    });

    it('writes nothing when the dialog is closed', async () => {
        vi.spyOn(dialog, 'showSaveDialog').mockResolvedValue({ canceled: true } as never);
        expect(await files.save(sender, 'звіт.xlsx', Buffer.from('x'))).toEqual({
            saved: false,
            fileName: null,
        });
        expect(await fsp.readdir(dir)).toEqual([]);
    });

    it('writes nothing when the screen locked while the dialog was open', async () => {
        const window = {
            id: 42,
            once: (): void => undefined,
            send: (): void => undefined,
            isDestroyed: () => false,
        } as never;
        sessionManager.set(window, {
            accountId: 1,
            username: 'komandyr',
            permissions: [],
        } as never);
        const target = path.join(dir, 'звіт.xlsx');
        vi.spyOn(dialog, 'showSaveDialog').mockImplementation((async () => {
            expect(dialogActivity.isOpen(42)).toBe(true);
            sessionManager.lock(42, { reason: 'idle', idleMinutes: 10 });
            return { canceled: false, filePath: target };
        }) as never);

        expect(await files.save(window, 'звіт.xlsx', Buffer.from('таблиця'))).toEqual({
            saved: false,
            fileName: null,
        });
        expect(fs.existsSync(target)).toBe(false);
        expect(dialogActivity.isOpen(42)).toBe(false);
    });

    it('reports a failed write without leaving half a file', async () => {
        const target = path.join(dir, 'missing-folder', 'звіт.xlsx');
        vi.spyOn(dialog, 'showSaveDialog').mockResolvedValue({
            canceled: false,
            filePath: target,
        } as never);
        await expect(files.save(sender, 'звіт.xlsx', Buffer.from('x'))).rejects.toMatchObject({
            code: 'VALIDATION',
        });
        expect(fs.existsSync(`${target}.partial`)).toBe(false);
    });
});

describe('picking files', () => {
    it('reads the chosen files, never records them in recent items, remembers the folder', async () => {
        const pdf = path.join(dir, 'наказ.pdf');
        const png = path.join(dir, 'фото.png');
        await fsp.writeFile(pdf, 'pdf-bytes');
        await fsp.writeFile(png, 'png-bytes');
        const open = vi
            .spyOn(dialog, 'showOpenDialog')
            .mockResolvedValue({ canceled: false, filePaths: [pdf, png] } as never);

        const picked = await files.pick(sender, 'documents', true);

        expect(picked.map(({ name, type, size }) => ({ name, type, size }))).toEqual([
            { name: 'наказ.pdf', type: 'application/pdf', size: 9 },
            { name: 'фото.png', type: 'image/png', size: 9 },
        ]);
        expect(Buffer.from(picked[0].data).toString()).toBe('pdf-bytes');
        const options = open.mock.calls[0][0] as unknown as Electron.OpenDialogOptions;
        expect(options.properties).toEqual(['openFile', 'multiSelections', 'dontAddToRecent']);

        await files.pick(sender, 'images', false);
        const next = open.mock.calls[1][0] as unknown as Electron.OpenDialogOptions;
        expect(next.defaultPath).toBe(dir);
        expect(next.properties).toEqual(['openFile', 'dontAddToRecent']);
    });

    it('returns nothing when the dialog is closed', async () => {
        vi.spyOn(dialog, 'showOpenDialog').mockResolvedValue({
            canceled: true,
            filePaths: [],
        } as never);
        expect(await files.pick(sender, 'excel', false)).toEqual([]);
    });
});

describe('clipboard', () => {
    const fakeClipboard = () => {
        let text = '';
        return {
            readText: () => text,
            writeText: (value: string) => {
                text = value;
            },
            clear: () => {
                text = '';
            },
        };
    };

    it('clears what the app copied when the session ends', () => {
        const clipboard = fakeClipboard();
        const guard = new ClipboardGuard(clipboard);
        guard.copy('АА 123456');
        guard.clearIfOurs();
        expect(clipboard.readText()).toBe('');
    });

    it('leaves alone what was copied afterwards in another program', () => {
        const clipboard = fakeClipboard();
        const guard = new ClipboardGuard(clipboard);
        guard.copy('АА 123456');
        clipboard.writeText('текст з іншої програми');
        guard.clearIfOurs();
        expect(clipboard.readText()).toBe('текст з іншої програми');
    });
});
