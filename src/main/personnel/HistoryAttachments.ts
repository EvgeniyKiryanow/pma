import fsp from 'fs/promises';
import mime from 'mime-types';

import type { Logger } from '../core/logger';
import { resolveInside, safeFileName } from '../core/paths';

export type IncomingAttachment = { name: string; type?: string; size?: number; dataUrl?: string };

/** What is kept in the history entry itself; the content lives on disk. */
export type AttachmentMeta = { name: string; type?: string; size?: number };

export function attachmentMeta(files: IncomingAttachment[] = []): AttachmentMeta[] {
    return files.map((file) => ({ name: file.name, type: file.type, size: file.size }));
}

/**
 * Files attached to personnel history entries: <root>/<userId>/<entryId>/<file>.
 * Every path is resolved inside the root, whatever the ids or names contain.
 */
export class HistoryAttachments {
    constructor(
        private readonly root: () => string,
        private readonly logger: Logger,
    ) {}

    entryDir(userId: number, entryId: number): string {
        return resolveInside(
            this.root(),
            safeFileName(String(userId)),
            safeFileName(String(entryId)),
        );
    }

    filePath(userId: number, entryId: number, fileName: string): string {
        return resolveInside(this.entryDir(userId, entryId), safeFileName(fileName));
    }

    /** Writes the files that carry content (`dataUrl`); the others are already on disk. */
    async save(userId: number, entryId: number, files: IncomingAttachment[]): Promise<void> {
        await fsp.mkdir(this.entryDir(userId, entryId), { recursive: true });
        for (const file of files) {
            if (!file.dataUrl || !file.dataUrl.includes(',')) continue;
            try {
                const base64 = file.dataUrl.split(',')[1];
                await fsp.writeFile(
                    this.filePath(userId, entryId, file.name),
                    Buffer.from(base64, 'base64'),
                );
            } catch (err) {
                this.logger.warn(`Failed to write an attachment of history entry #${entryId}`, err);
            }
        }
    }

    async readAsDataUrl(userId: number, entryId: number, fileName: string): Promise<string> {
        const buffer = await fsp.readFile(this.filePath(userId, entryId, fileName));
        const mimeType = mime.lookup(fileName) || 'application/octet-stream';
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
    }

    /** Deletes files of the entry that are not in `keep`. */
    async removeOthers(
        userId: number,
        entryId: number,
        existing: AttachmentMeta[],
        keep: AttachmentMeta[],
    ) {
        const kept = new Set(keep.map((file) => file.name));
        for (const file of existing) {
            if (kept.has(file.name)) continue;
            await fsp
                .rm(this.filePath(userId, entryId, file.name), { force: true })
                .catch((err) => this.logger.warn('Failed to delete a removed attachment', err));
        }
    }

    async removeEntry(userId: number, entryId: number): Promise<void> {
        await fsp
            .rm(this.entryDir(userId, entryId), { recursive: true, force: true })
            .catch((err) =>
                this.logger.warn('Failed to delete attachments of a history entry', err),
            );
    }
}
