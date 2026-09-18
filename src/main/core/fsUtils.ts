import { randomUUID } from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

const RETRYABLE = new Set(['EBUSY', 'EPERM', 'EACCES']);

async function withRetry<T>(work: () => Promise<T>, attempts = 5): Promise<T> {
    for (let i = 1; ; i++) {
        try {
            return await work();
        } catch (err: any) {
            // Windows: antivirus / indexer may hold a file for a moment right after it was closed.
            if (i >= attempts || !RETRYABLE.has(err?.code)) throw err;
            await new Promise((resolve) => setTimeout(resolve, 150 * i));
        }
    }
}

/** Moves a file or directory; falls back to copy + delete across volumes. Missing source is a no-op. */
export async function move(source: string, target: string): Promise<boolean> {
    if (!fs.existsSync(source)) return false;
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await withRetry(async () => {
        try {
            await fsp.rename(source, target);
        } catch (err: any) {
            if (err?.code !== 'EXDEV') throw err;
            await fsp.cp(source, target, { recursive: true, errorOnExist: true, force: false });
            await fsp.rm(source, { recursive: true, force: true });
        }
    });
    return true;
}

export async function remove(target: string): Promise<void> {
    await withRetry(() => fsp.rm(target, { recursive: true, force: true }));
}

/** Runs `work` with a fresh folder under `parent` and always removes the folder afterwards. */
export async function withTempDir<T>(
    parent: string,
    prefix: string,
    work: (dir: string) => Promise<T>,
): Promise<T> {
    const dir = path.join(parent, `${prefix}-${randomUUID()}`);
    await fsp.mkdir(dir, { recursive: true });
    try {
        return await work(dir);
    } finally {
        await remove(dir);
    }
}

const SHRED_CHUNK = 1024 * 1024;

/**
 * Overwrites every file under `target` with zeros, flushes it to disk and deletes it.
 * A plain delete only forgets where the bytes are; on a hard drive they stay readable with
 * recovery tools until overwritten. (On an SSD the drive decides where writes land, so this
 * is best effort — full-disk encryption is what protects data there.)
 */
export async function shred(target: string): Promise<{ files: number; bytes: number }> {
    const result = { files: 0, bytes: 0 };
    if (!fs.existsSync(target)) return result;
    const stat = await fsp.lstat(target);
    if (stat.isDirectory()) {
        for (const item of await fsp.readdir(target)) {
            const nested = await shred(path.join(target, item));
            result.files += nested.files;
            result.bytes += nested.bytes;
        }
    } else if (stat.isFile()) {
        if (stat.size > 0) {
            const zeros = Buffer.alloc(Math.min(SHRED_CHUNK, stat.size));
            const handle = await fsp.open(target, 'r+');
            try {
                for (let offset = 0; offset < stat.size; offset += zeros.length) {
                    const length = Math.min(zeros.length, stat.size - offset);
                    await handle.write(zeros, 0, length, offset);
                }
                await handle.sync();
            } finally {
                await handle.close();
            }
        }
        result.files += 1;
        result.bytes += stat.size;
    }
    await remove(target);
    return result;
}

export function timestampForFileName(date = new Date()): string {
    return date.toISOString().replace(/[:.]/g, '-');
}

export async function directorySize(directory: string): Promise<{ files: number; bytes: number }> {
    const result = { files: 0, bytes: 0 };
    if (!fs.existsSync(directory)) return result;
    for (const item of await fsp.readdir(directory, { withFileTypes: true })) {
        const full = path.join(directory, item.name);
        if (item.isDirectory()) {
            const nested = await directorySize(full);
            result.files += nested.files;
            result.bytes += nested.bytes;
        } else if (item.isFile()) {
            result.files += 1;
            result.bytes += (await fsp.stat(full)).size;
        }
    }
    return result;
}
