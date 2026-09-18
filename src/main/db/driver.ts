import Database from 'better-sqlite3-multiple-ciphers';
import fs from 'fs';

export type RunResult = { lastID: number; changes: number };

/**
 * The database interface every repository, service and migration uses. It is the subset of
 * the former `sqlite`/`sqlite3` wrapper the code relies on, so swapping the driver changed
 * nothing above this file. Calls are synchronous underneath (better-sqlite3); they are
 * exposed as promises to keep one calling convention.
 */
export type Db = {
    get<T = any>(sql: string, ...params: unknown[]): Promise<T | undefined>;
    all<T = any[]>(sql: string, ...params: unknown[]): Promise<T>;
    run(sql: string, ...params: unknown[]): Promise<RunResult>;
    exec(sql: string): Promise<void>;
    close(): Promise<void>;
};

export type OpenOptions = {
    /**
     * Encryption key (64 hex characters). `undefined`/`null` opens an unencrypted file —
     * databases of older versions, fixtures in tests.
     */
    key?: string | null;
    readonly?: boolean;
};

const HEX_KEY = /^[0-9a-f]{64}$/;

/**
 * Cipher settings of every encrypted database, stated instead of left to the driver's defaults:
 * a later driver version with other defaults must still open the files written today. These
 * are the defaults of SQLite3 Multiple Ciphers 2.4 (ChaCha20-Poly1305, PBKDF2-SHA256 with 64007
 * iterations). Never change them for existing data — a new scheme needs a new, explicit
 * migration of the files.
 */
const CIPHER_SETTINGS = ["cipher = 'chacha20'", 'kdf_iter = 64007', 'legacy = 0'];

function applyKey(db: Database.Database, key: string, pragma: 'key' | 'rekey'): void {
    if (!HEX_KEY.test(key)) throw new Error('Invalid database key format');
    for (const setting of CIPHER_SETTINGS) db.pragma(setting);
    db.pragma(`${pragma} = '${key}'`);
}
const SQLITE_HEADER = Buffer.from('SQLite format 3\0', 'latin1');

/** An unencrypted SQLite file starts with this header; an encrypted one looks random. */
export function isPlainSqliteHeader(head: Buffer): boolean {
    return head.subarray(0, SQLITE_HEADER.length).equals(SQLITE_HEADER);
}

/** True when `file` is an unencrypted SQLite database (older versions, fixtures). */
export function isPlainDatabaseFile(file: string): boolean {
    const head = Buffer.alloc(SQLITE_HEADER.length);
    const fd = fs.openSync(file, 'r');
    try {
        const read = fs.readSync(fd, head, 0, head.length, 0);
        return read === head.length && isPlainSqliteHeader(head);
    } finally {
        fs.closeSync(fd);
    }
}

/** node-sqlite3 accepted booleans and `undefined`; SQLite itself binds neither. */
function bindable(value: unknown): unknown {
    if (value === undefined) return null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (value instanceof Date) return value.toISOString();
    return value;
}

function isNamed(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !Buffer.isBuffer(value) &&
        !ArrayBuffer.isView(value)
    );
}

/** Accepts `(sql, a, b)`, `(sql, [a, b])` and `(sql, { $a: 1 })` like the old wrapper did. */
function bindings(params: unknown[]): unknown[] {
    if (params.length === 1 && Array.isArray(params[0])) return params[0].map(bindable);
    if (params.length === 1 && isNamed(params[0])) {
        const named: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(params[0])) {
            named[key.replace(/^[$:@]/, '')] = bindable(value);
        }
        return [named];
    }
    return params.map(bindable);
}

class BetterSqliteDb implements Db {
    constructor(private readonly db: Database.Database) {}

    async get<T = any>(sql: string, ...params: unknown[]): Promise<T | undefined> {
        return this.db.prepare(sql).get(...bindings(params)) as T | undefined;
    }

    async all<T = any[]>(sql: string, ...params: unknown[]): Promise<T> {
        return this.db.prepare(sql).all(...bindings(params)) as T;
    }

    async run(sql: string, ...params: unknown[]): Promise<RunResult> {
        const result = this.db.prepare(sql).run(...bindings(params));
        return { lastID: Number(result.lastInsertRowid), changes: result.changes };
    }

    async exec(sql: string): Promise<void> {
        this.db.exec(sql);
    }

    async close(): Promise<void> {
        if (this.db.open) this.db.close();
    }
}

/**
 * Opens a database file. With a key the file is encrypted (SQLite3 Multiple Ciphers,
 * ChaCha20-Poly1305): without the key it is random bytes. A wrong key is reported as
 * `SQLITE_NOTADB` on the first query, which is run here so the caller finds out at once.
 */
export function openDatabase(file: string, options: OpenOptions = {}): Db {
    const db = new Database(file, { readonly: Boolean(options.readonly), timeout: 5000 });
    try {
        if (options.key) applyKey(db, options.key, 'key');
        db.prepare('SELECT count(*) FROM sqlite_master').get();
    } catch (err) {
        db.close();
        throw err;
    }
    return new BetterSqliteDb(db);
}

/**
 * Encrypts an unencrypted database file in place with `key`. Used on a *copy* of the data
 * (the caller swaps it in after checking it), so an interruption never damages the original.
 */
export function encryptPlainDatabase(file: string, key: string): void {
    if (!HEX_KEY.test(key)) throw new Error('Invalid database key format');
    const db = new Database(file);
    try {
        // Rekeying is not possible in WAL mode.
        db.pragma('journal_mode = DELETE');
        applyKey(db, key, 'rekey');
    } finally {
        db.close();
    }
}
