import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

import { move, remove, shred } from '../core/fsUtils';
import type { Logger } from '../core/logger';
import { encryptPlainDatabase, isPlainDatabaseFile, openDatabase } from '../db/driver';
import { ENCRYPTED_FILE_MAGIC_BYTES, type FileCipher, isEncryptedFile } from './FileCipher';

const PENDING = '.encrypting';

export type EncryptionReport = { databases: number; files: number };

async function readHead(file: string, bytes: number): Promise<Buffer> {
    const handle = await fsp.open(file, 'r');
    try {
        const head = Buffer.alloc(bytes);
        const { bytesRead } = await handle.read(head, 0, bytes, 0);
        return head.subarray(0, bytesRead);
    } finally {
        await handle.close();
    }
}

async function tableCounts(file: string, key: string | null): Promise<Record<string, number>> {
    const db = openDatabase(file, { readonly: true, key });
    try {
        const tables = await db.all<{ name: string }[]>(
            `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
        );
        const counts: Record<string, number> = {};
        for (const { name } of tables) {
            counts[name] = (await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM "${name}"`))?.n ?? 0;
        }
        return counts;
    } finally {
        await db.close();
    }
}

/**
 * Brings data written unencrypted (older versions, old backups) to the encrypted form: the
 * database, attachments and saved reports, local copies. Parts already encrypted are left
 * alone, so running it again is harmless.
 *
 * Every file is encrypted into a copy that is checked before it replaces the original, and
 * the unencrypted original is overwritten before it is deleted. An interrupted run is
 * finished on the next start.
 */
export class DataEncryptor {
    constructor(
        private readonly databaseKey: () => string | null,
        private readonly cipher: FileCipher,
        private readonly logger: Logger,
    ) {}

    /** Encrypts one unencrypted database file in place (through a checked copy). */
    async encryptDatabase(file: string): Promise<boolean> {
        const key = this.databaseKey();
        if (!key) throw new Error('Data key is locked');
        const pending = `${file}${PENDING}`;
        await remove(pending);
        if (!fs.existsSync(file) || !isPlainDatabaseFile(file)) return false;

        // Changes still in the write-ahead log belong in the file before it is copied.
        const plain = openDatabase(file, { key: null });
        try {
            await plain.exec('PRAGMA wal_checkpoint(TRUNCATE)');
        } finally {
            await plain.close();
        }

        await fsp.copyFile(file, pending);
        encryptPlainDatabase(pending, key);
        const [before, after] = [await tableCounts(file, null), await tableCounts(pending, key)];
        const check = openDatabase(pending, { readonly: true, key });
        try {
            const result = await check.get<{ quick_check: string }>('PRAGMA quick_check');
            if (result?.quick_check !== 'ok') throw new Error('Encrypted copy failed quick_check');
        } finally {
            await check.close();
        }
        if (JSON.stringify(before) !== JSON.stringify(after)) {
            await remove(pending);
            throw new Error('Encrypted copy differs from the original');
        }

        for (const suffix of ['-wal', '-shm', '-journal']) await remove(`${file}${suffix}`);
        const original = `${file}.plain`;
        await move(file, original);
        await move(pending, file);
        await shred(original);
        return true;
    }

    /** Encrypts every unencrypted file under `dir`; returns how many were converted. */
    async encryptFiles(dir: string): Promise<number> {
        if (!this.cipher.enabled || !fs.existsSync(dir)) return 0;
        let converted = 0;
        for (const item of await fsp.readdir(dir, { withFileTypes: true })) {
            const full = path.join(dir, item.name);
            if (item.isDirectory()) {
                converted += await this.encryptFiles(full);
                continue;
            }
            if (!item.isFile()) continue;
            if (full.endsWith(PENDING)) {
                await this.finishPendingFile(full);
                continue;
            }
            if (isEncryptedFile(await readHead(full, ENCRYPTED_FILE_MAGIC_BYTES))) continue;

            const pending = `${full}${PENDING}`;
            const encrypted = this.cipher.encrypt(await fsp.readFile(full));
            const handle = await fsp.open(pending, 'w');
            try {
                await handle.writeFile(encrypted);
                await handle.sync();
            } finally {
                await handle.close();
            }
            await shred(full);
            await move(pending, full);
            converted += 1;
        }
        return converted;
    }

    /**
     * Local copies: `auto/*.sqlite` and `safety/<copy>/` (a database plus, for copies taken
     * before a restore or reset, the attachment and report folders).
     */
    async encryptSnapshots(
        autoDir: string,
        safetyDir: string,
        dataFolders: readonly string[],
    ): Promise<EncryptionReport> {
        const report: EncryptionReport = { databases: 0, files: 0 };
        if (fs.existsSync(autoDir)) {
            for (const name of await fsp.readdir(autoDir)) {
                if (!/\.(db|sqlite)$/i.test(name)) continue;
                if (await this.encryptDatabase(path.join(autoDir, name))) report.databases += 1;
            }
        }
        if (fs.existsSync(safetyDir)) {
            for (const item of await fsp.readdir(safetyDir, { withFileTypes: true })) {
                if (!item.isDirectory()) continue;
                const copy = path.join(safetyDir, item.name);
                if (await this.encryptDatabase(path.join(copy, 'users.db'))) report.databases += 1;
                for (const folder of dataFolders) {
                    report.files += await this.encryptFiles(path.join(copy, folder));
                }
            }
        }
        return report;
    }

    /** A copy left by an interrupted run: complete (it decrypts) → put in place, else drop. */
    private async finishPendingFile(pending: string): Promise<void> {
        const target = pending.slice(0, -PENDING.length);
        try {
            this.cipher.decrypt(await fsp.readFile(pending));
            await move(pending, target);
            this.logger.warn('Finished the encryption of a file interrupted earlier');
        } catch {
            await remove(pending);
        }
    }
}
