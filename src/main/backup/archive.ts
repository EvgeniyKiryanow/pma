import { once } from 'events';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';

import { AppError } from '../../shared/ipc/result';

/**
 * Minimal streaming container (plaintext, always encrypted afterwards):
 *
 *   "PMAR" | version:u8 | entries... | end marker (kind 0)
 *   entry = kind:u8(1) | pathLength:u16BE | path (utf8, "/"-separated) | size:u64BE | bytes
 *
 * No dependency, streams large attachments without loading them into memory.
 */

const MAGIC = Buffer.from('PMAR', 'ascii');
const VERSION = 1;
const KIND_END = 0;
const KIND_FILE = 1;

export type ArchiveEntry = { path: string; offset: number; size: number };

function normalizeEntryPath(entryPath: string): string {
    const normalized = entryPath.replace(/\\/g, '/');
    if (
        !normalized ||
        normalized.startsWith('/') ||
        /^[a-zA-Z]:/.test(normalized) ||
        normalized.split('/').some((part) => part === '..' || part === '')
    ) {
        throw new AppError('CORRUPTED', `Invalid archive entry path: ${entryPath}`);
    }
    return normalized;
}

export class ArchiveWriter {
    private readonly out: fs.WriteStream;
    private entries = 0;
    private bytes = 0;

    constructor(filePath: string) {
        this.out = fs.createWriteStream(filePath);
    }

    async open(): Promise<void> {
        await this.write(Buffer.concat([MAGIC, Buffer.from([VERSION])]));
    }

    async addBuffer(entryPath: string, data: Buffer): Promise<void> {
        await this.writeEntryHeader(entryPath, data.length);
        await this.write(data);
    }

    async addFile(entryPath: string, sourcePath: string): Promise<void> {
        const { size } = await fsp.stat(sourcePath);
        await this.writeEntryHeader(entryPath, size);
        let written = 0;
        for await (const chunk of fs.createReadStream(sourcePath)) {
            written += (chunk as Buffer).length;
            await this.write(chunk as Buffer);
        }
        if (written !== size) throw new Error(`File changed while archiving: ${entryPath}`);
    }

    /** Adds every file under `directory` as `<prefix>/<relative path>`. */
    async addDirectory(prefix: string, directory: string): Promise<void> {
        if (!fs.existsSync(directory)) return;
        const walk = async (dir: string): Promise<void> => {
            for (const item of await fsp.readdir(dir, { withFileTypes: true })) {
                const full = path.join(dir, item.name);
                if (item.isDirectory()) await walk(full);
                else if (item.isFile()) {
                    const relative = path.relative(directory, full).split(path.sep).join('/');
                    await this.addFile(`${prefix}/${relative}`, full);
                }
            }
        };
        await walk(directory);
    }

    async close(): Promise<{ entries: number; bytes: number }> {
        await this.write(Buffer.from([KIND_END]));
        this.out.end();
        await once(this.out, 'finish');
        return { entries: this.entries, bytes: this.bytes };
    }

    private async writeEntryHeader(entryPath: string, size: number): Promise<void> {
        const name = Buffer.from(normalizeEntryPath(entryPath), 'utf8');
        const header = Buffer.alloc(1 + 2 + name.length + 8);
        header.writeUInt8(KIND_FILE, 0);
        header.writeUInt16BE(name.length, 1);
        name.copy(header, 3);
        header.writeBigUInt64BE(BigInt(size), 3 + name.length);
        await this.write(header);
        this.entries += 1;
        this.bytes += size;
    }

    private async write(chunk: Buffer): Promise<void> {
        if (!this.out.write(chunk)) await once(this.out, 'drain');
    }
}

export async function readArchiveIndex(filePath: string): Promise<ArchiveEntry[]> {
    const { size } = await fsp.stat(filePath);
    const handle = await fsp.open(filePath, 'r');
    const read = async (length: number, position: number): Promise<Buffer> => {
        if (position + length > size) throw new AppError('CORRUPTED');
        const buffer = Buffer.alloc(length);
        await handle.read(buffer, 0, length, position);
        return buffer;
    };

    try {
        const head = await read(5, 0);
        if (!head.subarray(0, 4).equals(MAGIC) || head[4] !== VERSION) {
            throw new AppError('UNSUPPORTED_FORMAT');
        }
        const entries: ArchiveEntry[] = [];
        let position = 5;
        for (;;) {
            const kind = (await read(1, position))[0];
            position += 1;
            if (kind === KIND_END) break;
            if (kind !== KIND_FILE) throw new AppError('CORRUPTED');
            const nameLength = (await read(2, position)).readUInt16BE(0);
            position += 2;
            const name = (await read(nameLength, position)).toString('utf8');
            position += nameLength;
            const entrySize = Number((await read(8, position)).readBigUInt64BE(0));
            position += 8;
            if (position + entrySize > size) throw new AppError('CORRUPTED');
            entries.push({ path: normalizeEntryPath(name), offset: position, size: entrySize });
            position += entrySize;
        }
        return entries;
    } finally {
        await handle.close();
    }
}

export async function extractEntry(
    archivePath: string,
    entry: ArchiveEntry,
    target: string,
): Promise<void> {
    await fsp.mkdir(path.dirname(target), { recursive: true });
    if (entry.size === 0) {
        await fsp.writeFile(target, Buffer.alloc(0));
        return;
    }
    await pipeline(
        fs.createReadStream(archivePath, {
            start: entry.offset,
            end: entry.offset + entry.size - 1,
        }),
        fs.createWriteStream(target),
    );
}

export async function readEntry(archivePath: string, entry: ArchiveEntry): Promise<Buffer> {
    const handle = await fsp.open(archivePath, 'r');
    try {
        const buffer = Buffer.alloc(entry.size);
        await handle.read(buffer, 0, entry.size, entry.offset);
        return buffer;
    } finally {
        await handle.close();
    }
}
