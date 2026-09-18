import { ipcMain } from 'electron';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

import { access, handleResult } from '../ipc/secureHandle';
import { storageError } from './storageErrors';

describe('storageError', () => {
    it.each([
        ['ENOSPC', /не вистачає місця/],
        ['EROFS', /захищений від запису/],
        ['EBUSY', /відкритий в іншій програмі/],
        ['EPERM', /відкритий в іншій програмі/],
        ['ENODEV', /флешку від’єднали/],
        ['EIO', /пошкоджені/],
    ])('explains %s in plain words', (code, message) => {
        const error = storageError(Object.assign(new Error('raw'), { code }));
        expect(error?.code).toBe('STORAGE');
        expect(error?.message).toMatch(message);
        expect(error?.details).toEqual({ reason: code });
    });

    it('recognises a real failure of the file system', async () => {
        const missing = path.join(os.tmpdir(), `pma-missing-${Date.now()}`, 'copy.pmb');
        const failure = await fsp.writeFile(missing, 'x').catch((err: unknown) => err);
        expect(storageError(failure)?.details).toEqual({ reason: 'ENOENT' });
    });

    it('leaves other errors alone', () => {
        expect(storageError(new Error('bug'))).toBeNull();
        expect(storageError(Object.assign(new Error('x'), { code: 'ERR_SOMETHING' }))).toBeNull();
        expect(storageError(null)).toBeNull();
    });

    it('reaches the window as a readable message instead of «Сталася помилка»', async () => {
        let registered: ((event: unknown, ...args: unknown[]) => Promise<unknown>) | undefined;
        vi.spyOn(ipcMain, 'handle').mockImplementation(((_channel: string, fn: never) => {
            registered = fn;
        }) as never);
        handleResult('test:save-to-flash', access.public, async () => {
            throw Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' });
        });
        const event = { sender: { id: 1 }, senderFrame: { url: 'http://localhost:5173/' } };
        const reply = (await registered!(event)) as { ok: boolean; error: string; message: string };
        expect(reply.ok).toBe(false);
        expect(reply.error).toBe('STORAGE');
        expect(reply.message).toMatch(/не вистачає місця/);
    });
});
