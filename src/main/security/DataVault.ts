import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

import { shred } from '../core/fsUtils';

/** Protects the key for the signed-in Windows user (DPAPI) — or does nothing elsewhere. */
export type KeyProtector = {
    available(): boolean;
    protect(data: Buffer): Buffer;
    unprotect(data: Buffer): Buffer;
};

type PasswordWrap = {
    salt: string;
    iv: string;
    tag: string;
    data: string;
    /** scrypt cost N; absent in the first copies, which used 2^15. */
    n?: number;
};

type KeystoreFile = {
    version: 1;
    /** The key protected by Windows for the signed-in Windows user. */
    windows?: string;
    /** The key protected by each PManager account's password (normalized login → wrap). */
    accounts: Record<string, PasswordWrap>;
};

export type VaultState = 'unlocked' | 'locked' | 'missing';

export type VaultSnapshot = { key: Buffer | null; store: KeystoreFile | null };

const KEY_BYTES = 32;
/** Same cost as the backup packages: ~0.3 s and 128 MB per attempt, on a worker thread. */
const WRAP_COST = 1 << 17;
const ALLOWED_COSTS = new Set([1 << 15, 1 << 16, 1 << 17, 1 << 18]);

function scrypt(password: string, salt: Buffer, cost: number): Promise<Buffer> {
    return new Promise((resolve, reject) =>
        crypto.scrypt(
            password,
            salt,
            KEY_BYTES,
            { N: cost, r: 8, p: 1, maxmem: 512 * 1024 * 1024 },
            (err, key) => (err ? reject(err) : resolve(key)),
        ),
    );
}

async function wrapWithPassword(key: Buffer, password: string): Promise<PasswordWrap> {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const kek = await scrypt(password, salt, WRAP_COST);
    const cipher = crypto.createCipheriv('aes-256-gcm', kek, iv);
    const data = Buffer.concat([cipher.update(key), cipher.final()]);
    return {
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
        data: data.toString('base64'),
        n: WRAP_COST,
    };
}

async function unwrapWithPassword(wrap: PasswordWrap, password: string): Promise<Buffer> {
    const cost = wrap.n ?? 1 << 15;
    if (!ALLOWED_COSTS.has(cost)) throw new Error('Unsupported key copy');
    const kek = await scrypt(password, Buffer.from(wrap.salt, 'base64'), cost);
    const decipher = crypto.createDecipheriv('aes-256-gcm', kek, Buffer.from(wrap.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(wrap.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(wrap.data, 'base64')), decipher.final()]);
}

/**
 * The key of the data set. The database, attachments, saved reports and local copies are all
 * encrypted with it; the key itself never lies on disk in the clear (`keystore.json`):
 *
 * - Windows protects one copy for the signed-in Windows user (DPAPI), so the app opens its
 *   data at start without asking anything;
 * - each PManager account protects one copy with its password. If Windows can no longer open
 *   its copy (password reset by an administrator, a new Windows profile), signing in to
 *   PManager opens the data and gives Windows a fresh copy.
 *
 * Destroying `keystore.json` makes every encrypted byte of the data set unreadable at once,
 * including remnants a disk may keep after files were deleted.
 */
export class DataVault {
    private key: Buffer | null = null;
    private store: KeystoreFile | null = null;

    constructor(
        private readonly file: () => string,
        private readonly protector: KeyProtector,
    ) {}

    get isUnlocked(): boolean {
        return this.key !== null;
    }

    /** Whether a keystore exists (a data set was encrypted on this computer). */
    get exists(): boolean {
        return this.store !== null;
    }

    /** Key for the database driver (hex); null while locked. */
    databaseKey(): string | null {
        return this.key ? this.key.toString('hex') : null;
    }

    /** Key for attachments and saved reports, derived from the data key. */
    fileKey(): Buffer | null {
        if (!this.key) return null;
        return Buffer.from(
            crypto.hkdfSync('sha256', this.key, Buffer.alloc(0), 'pmanager-files', 32),
        );
    }

    /** Whether some account can open the data with its password. */
    get hasPasswordCopies(): boolean {
        return Boolean(this.store && Object.keys(this.store.accounts).length);
    }

    async load(): Promise<VaultState> {
        this.key = null;
        this.store = null;
        if (!fs.existsSync(this.file())) return 'missing';
        this.store = JSON.parse(await fsp.readFile(this.file(), 'utf8')) as KeystoreFile;
        this.store.accounts ??= {};
        if (this.store.windows && this.protector.available()) {
            try {
                const key = this.protector.unprotect(Buffer.from(this.store.windows, 'base64'));
                if (key.length === KEY_BYTES) this.key = key;
            } catch {
                // another Windows user or a reset Windows password: sign-in opens the data
            }
        }
        return this.key ? 'unlocked' : 'locked';
    }

    /** A new key for a new data set (first start, after everything was destroyed). */
    async create(): Promise<void> {
        this.key = crypto.randomBytes(KEY_BYTES);
        this.store = { version: 1, accounts: {} };
        await this.save();
    }

    /** Takes over the key of a restored backup; accounts add their copies at next sign-in. */
    async adopt(key: Buffer): Promise<void> {
        if (key.length !== KEY_BYTES) throw new Error('Invalid data key');
        this.key = Buffer.from(key);
        this.store = { version: 1, accounts: {} };
        await this.save();
    }

    /** The key itself, to put into an encrypted backup. */
    exportKey(): Buffer {
        if (!this.key) throw new Error('Data key is locked');
        return Buffer.from(this.key);
    }

    /** Opens the data with a PManager password; false when it cannot. */
    async unlockWithPassword(username: string, password: string): Promise<boolean> {
        const wrap = this.store?.accounts[username];
        if (!wrap || typeof password !== 'string') return false;
        let key: Buffer;
        try {
            key = await unwrapWithPassword(wrap, password);
        } catch {
            return false;
        }
        if (key.length !== KEY_BYTES) return false;
        this.key = key;
        await this.save(); // Windows gets a fresh copy for the current user
        return true;
    }

    /** Called after a password was verified or changed: that password can open the data. */
    async rememberAccount(username: string, password: string): Promise<void> {
        if (!this.key || !this.store || !username || typeof password !== 'string') return;
        const key = this.key;
        const wrap = await wrapWithPassword(key, password);
        // The key may have changed while scrypt ran (a restore adopted another one).
        if (this.key !== key || !this.store) return;
        this.store.accounts[username] = wrap;
        await this.save();
    }

    /** The account was deleted, deactivated or its password reset by an administrator. */
    async forgetAccount(username: string): Promise<void> {
        if (!this.store?.accounts[username]) return;
        delete this.store.accounts[username];
        await this.save();
    }

    snapshot(): VaultSnapshot {
        return {
            key: this.key ? Buffer.from(this.key) : null,
            store: this.store ? JSON.parse(JSON.stringify(this.store)) : null,
        };
    }

    /** Puts the vault back as it was (an operation that changed the key failed). */
    async restore(snapshot: VaultSnapshot): Promise<void> {
        this.key = snapshot.key ? Buffer.from(snapshot.key) : null;
        this.store = snapshot.store;
        if (this.store) await this.writeStore();
        else await shred(this.file());
    }

    /** Copy of the keystore file (kept next to safety copies of the old data set). */
    async copyTo(target: string): Promise<void> {
        if (!fs.existsSync(this.file())) return;
        await fsp.mkdir(path.dirname(target), { recursive: true });
        await fsp.copyFile(this.file(), target);
    }

    /** Overwrites and deletes the keystore: nothing encrypted with this key can be read. */
    async destroy(): Promise<void> {
        this.key = null;
        this.store = null;
        await shred(this.file());
    }

    private async save(): Promise<void> {
        if (!this.store || !this.key) return;
        if (this.protector.available()) {
            this.store.windows = this.protector.protect(this.key).toString('base64');
        } else {
            delete this.store.windows;
        }
        await this.writeStore();
    }

    private async writeStore(): Promise<void> {
        const file = this.file();
        await fsp.mkdir(path.dirname(file), { recursive: true });
        const partial = `${file}.partial`;
        await fsp.writeFile(partial, JSON.stringify(this.store, null, 2), 'utf8');
        await fsp.rename(partial, file);
    }
}
