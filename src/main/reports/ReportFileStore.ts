import fsp from 'fs/promises';

import { resolveInside, safeFileName } from '../core/paths';

/** Converts a Node buffer into the ArrayBuffer the renderer receives over IPC. */
export function toArrayBuffer(buffer: Buffer): ArrayBuffer {
    return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
}

/**
 * Files of uploaded report templates. They are always addressed by file name inside one
 * folder; older databases stored absolute paths, which are reduced to the file name.
 */
export class ReportFileStore {
    constructor(private readonly root: () => string) {}

    pathOf(fileNameOrLegacyPath: string): string {
        return resolveInside(this.root(), safeFileName(fileNameOrLegacyPath));
    }

    /** Writes the file and returns the name it is stored under. */
    async save(name: string, content: Buffer): Promise<string> {
        await fsp.mkdir(this.root(), { recursive: true });
        const fileName = safeFileName(name);
        await fsp.writeFile(this.pathOf(fileName), content);
        return fileName;
    }

    async read(fileName: string): Promise<ArrayBuffer> {
        return toArrayBuffer(await fsp.readFile(this.pathOf(fileName)));
    }

    /** Best effort: a file that is already gone is not an error. */
    async remove(fileName: string): Promise<void> {
        await fsp.rm(this.pathOf(fileName), { force: true }).catch(() => undefined);
    }
}
