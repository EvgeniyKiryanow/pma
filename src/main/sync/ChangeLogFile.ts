import { createDecipheriv } from 'crypto';
import fsp from 'fs/promises';
import path from 'path';

import { decryptPackage, detectFormat, encryptFile } from '../backup/crypto';
import { withTempDir } from '../core/fsUtils';
import type { ChangeRow } from './ChangeJournal';

export class InvalidChangeLogPassword extends Error {
    constructor() {
        super('invalid-password');
    }
}

/** v1.x change logs: AES-256-GCM with the password padded into the key, JSON inside. */
function decryptLegacy(buffer: Buffer, password: string): unknown {
    const key = Buffer.from(password.padEnd(32, ' '), 'utf8');
    if (key.length !== 32) throw new InvalidChangeLogPassword();
    try {
        const decipher = createDecipheriv('aes-256-gcm', key, buffer.subarray(0, 12));
        decipher.setAuthTag(buffer.subarray(12, 28));
        const plain = Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]);
        return JSON.parse(plain.toString('utf8'));
    } catch {
        throw new InvalidChangeLogPassword();
    }
}

/**
 * Encrypted change-log file (`.pmc`). Written in the backup container format (pmb v2); older
 * files in the v1 cipher can still be read. Plain JSON only ever exists in a staging folder.
 */
export class ChangeLogFile {
    constructor(private readonly stagingRoot: () => string) {}

    async write(filePath: string, changes: ChangeRow[], password: string): Promise<void> {
        await withTempDir(this.stagingRoot(), 'changelog', async (dir) => {
            const plain = path.join(dir, 'changes.json');
            await fsp.writeFile(plain, JSON.stringify(changes), 'utf8');
            await encryptFile(plain, filePath, password);
        });
    }

    /** Throws InvalidChangeLogPassword for a wrong password; other errors mean unreadable. */
    async read(filePath: string, password: string): Promise<unknown> {
        if ((await detectFormat(filePath)) !== 'pmb2') {
            return decryptLegacy(await fsp.readFile(filePath), password);
        }
        return withTempDir(this.stagingRoot(), 'changelog', async (dir) => {
            const plain = path.join(dir, 'changes.json');
            try {
                await decryptPackage(filePath, plain, password);
            } catch (err: any) {
                if (err?.code === 'INVALID_PASSWORD') throw new InvalidChangeLogPassword();
                throw err;
            }
            return JSON.parse(await fsp.readFile(plain, 'utf8'));
        });
    }
}
