import fs from 'fs';
import fsp from 'fs/promises';
import mime from 'mime-types';
import path from 'path';

import { AppError } from '../../shared/ipc/result';
import { move, remove } from '../core/fsUtils';
import type { Logger } from '../core/logger';
import { resolveInside, safeFileName } from '../core/paths';
import { FileCipher } from '../security/FileCipher';

export type IncomingAttachment = { name: string; type?: string; size?: number; dataUrl?: string };

/** What is kept in the history entry itself; the content lives on disk. */
export type AttachmentMeta = { name: string; type?: string; size?: number };

export function attachmentMeta(files: IncomingAttachment[] = []): AttachmentMeta[] {
    return files.map((file) => ({ name: file.name, type: file.type, size: file.size }));
}

/** "scan.pdf" → "scan (2).pdf", "scan (3).pdf"… until the name is free. */
export function uniqueName(name: string, taken: Set<string>): string {
    if (!taken.has(name.toLowerCase())) return name;
    const { name: base, ext } = path.parse(name);
    for (let i = 2; ; i++) {
        const candidate = `${base} (${i})${ext}`;
        if (!taken.has(candidate.toLowerCase())) return candidate;
    }
}

function decodeDataUrl(dataUrl: string): Buffer | null {
    const comma = dataUrl.indexOf(',');
    if (!dataUrl.startsWith('data:') || comma < 0) return null;
    const header = dataUrl.slice(0, comma);
    const payload = dataUrl.slice(comma + 1);
    return header.endsWith(';base64')
        ? Buffer.from(payload, 'base64')
        : Buffer.from(decodeURIComponent(payload), 'utf8');
}

/**
 * Files attached to personnel history entries: <root>/<userId>/<entryId>/<file>.
 * Every path is resolved inside the root, whatever the ids or names contain.
 */
export class HistoryAttachments {
    constructor(
        private readonly root: () => string,
        private readonly logger: Logger,
        /** Content is stored encrypted with the data key (pass-through without a key). */
        private readonly cipher: FileCipher = new FileCipher(() => null),
    ) {}

    entryDir(userId: number, entryId: number): string {
        return resolveInside(
            this.root(),
            safeFileName(String(userId)),
            safeFileName(String(entryId)),
        );
    }

    personDir(userId: number): string {
        return resolveInside(this.root(), safeFileName(String(userId)));
    }

    filePath(userId: number, entryId: number, fileName: string): string {
        return resolveInside(this.entryDir(userId, entryId), safeFileName(fileName));
    }

    /**
     * Writes the files that carry content (`dataUrl`); the others are already on disk.
     * Returns the metadata to store in the entry — names are made unique, so two files
     * called "scan.pdf" never overwrite each other.
     *
     * All or nothing: if one file cannot be written, the files written by this call are
     * removed again and the error is thrown, so the entry is never saved without its
     * documents.
     */
    async save(
        userId: number,
        entryId: number,
        files: IncomingAttachment[],
    ): Promise<AttachmentMeta[]> {
        return this.saveInto(this.entryDir(userId, entryId), files, `history entry #${entryId}`);
    }

    private async saveInto(
        dir: string,
        files: IncomingAttachment[],
        owner: string,
    ): Promise<AttachmentMeta[]> {
        await fsp.mkdir(dir, { recursive: true });

        const taken = new Set<string>();
        const meta: AttachmentMeta[] = [];
        const written: string[] = [];
        let partial: string | null = null;
        try {
            for (const file of files) {
                const name = uniqueName(safeFileName(file.name), taken);
                taken.add(name.toLowerCase());
                if (!file.dataUrl) {
                    // Already on disk from an earlier save.
                    meta.push({ name, type: file.type, size: file.size });
                    continue;
                }
                const content = decodeDataUrl(file.dataUrl);
                if (!content) throw new Error(`Attachment #${meta.length + 1} is not a data URL`);
                const target = resolveInside(dir, name);
                const existed = fs.existsSync(target);
                // Written aside and renamed: a crash never leaves half a document in place.
                partial = `${target}.partial`;
                await fsp.writeFile(partial, this.cipher.encrypt(content));
                await move(partial, target);
                partial = null;
                if (!existed) written.push(target);
                meta.push({ name, type: file.type, size: content.length });
            }
            return meta;
        } catch (err) {
            this.logger.error(`Failed to write attachments of ${owner}`, err);
            if (partial) await remove(partial).catch(() => undefined);
            for (const target of written) await remove(target).catch(() => undefined);
            throw err;
        }
    }

    async readAsDataUrl(userId: number, entryId: number, fileName: string): Promise<string> {
        return this.readFile(this.filePath(userId, entryId, fileName), fileName);
    }

    private async readFile(target: string, fileName: string): Promise<string> {
        const buffer = this.cipher.decrypt(await fsp.readFile(target));
        const mimeType = mime.lookup(fileName) || 'application/octet-stream';
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
    }

    // ------------------------------------------------------------ documents of awards
    // <root>/<userId>/awards/<recordId>/<file>; the record id is the award's UUID in the card.

    awardDir(userId: number, recordId: string): string {
        return resolveInside(
            this.root(),
            safeFileName(String(userId)),
            'awards',
            safeFileName(recordId),
        );
    }

    /** Writes the new files of an award (all or nothing) and returns what the card keeps. */
    saveAwardFiles(
        userId: number,
        recordId: string,
        files: IncomingAttachment[],
    ): Promise<AttachmentMeta[]> {
        return this.saveInto(this.awardDir(userId, recordId), files, `award ${recordId}`);
    }

    /** Throws NOT_FOUND when the file is not on this computer (e.g. the card came by exchange). */
    readAwardFile(userId: number, recordId: string, fileName: string): Promise<string> {
        return this.readFromDir(this.awardDir(userId, recordId), fileName);
    }

    /** Deletes files of an award that are no longer listed in it. */
    removeAwardFilesExcept(userId: number, recordId: string, keep: AttachmentMeta[]) {
        return this.keepOnly(this.awardDir(userId, recordId), keep);
    }

    // ------------------------------------------------------------ documents of a person
    // <root>/<userId>/documents/<documentUuid>/<file>

    documentDir(userId: number, documentUuid: string): string {
        return resolveInside(
            this.root(),
            safeFileName(String(userId)),
            'documents',
            safeFileName(documentUuid),
        );
    }

    // ------------------------------------------------------------ files of the journal
    // <root>/journal/<entryUuid>/<file> (no person: never removed with one)

    journalDir(entryUuid: string): string {
        return resolveInside(this.root(), 'journal', safeFileName(entryUuid));
    }

    // ------------------------------------------------------------ any folder of the above

    /** Writes the files that carry content into `dir` (all or nothing). */
    saveToDir(dir: string, files: IncomingAttachment[], owner: string): Promise<AttachmentMeta[]> {
        return this.saveInto(dir, files, owner);
    }

    /** A file of `dir` as a data URL; NOT_FOUND when it is not on this computer. */
    async readFromDir(dir: string, fileName: string): Promise<string> {
        const target = resolveInside(dir, safeFileName(fileName));
        try {
            return await this.readFile(target, fileName);
        } catch {
            throw new AppError('NOT_FOUND', `File not found: ${fileName}`);
        }
    }

    /** Deletes the files of `dir` not listed in `keep`; the folder too when nothing is kept. */
    async keepOnly(dir: string, keep: AttachmentMeta[]): Promise<void> {
        const kept = new Set(keep.map((file) => file.name.toLowerCase()));
        const names = await fsp.readdir(dir).catch(() => [] as string[]);
        for (const name of names) {
            if (kept.has(name.toLowerCase())) continue;
            await fsp
                .rm(resolveInside(dir, name), { force: true })
                .catch((err) => this.logger.warn('Failed to delete a removed file', err));
        }
        if (!keep.length) await this.removeDir(dir);
    }

    async removeDir(dir: string): Promise<void> {
        await fsp
            .rm(dir, { recursive: true, force: true })
            .catch((err) => this.logger.warn('Failed to delete a folder of files', err));
    }

    /** Deletes files of the entry that are not in `keep`. */
    async removeOthers(
        userId: number,
        entryId: number,
        existing: AttachmentMeta[],
        keep: AttachmentMeta[],
    ) {
        const kept = new Set(keep.map((file) => file.name.toLowerCase()));
        for (const file of existing) {
            if (kept.has(file.name.toLowerCase())) continue;
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

    /** Every attachment of a person — called when the person is deleted. */
    async removePerson(userId: number): Promise<void> {
        await fsp
            .rm(this.personDir(userId), { recursive: true, force: true })
            .catch((err) => this.logger.warn('Failed to delete attachments of a person', err));
    }
}
