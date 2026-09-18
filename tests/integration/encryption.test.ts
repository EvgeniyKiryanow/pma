import { app } from 'electron';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Container } from '../../src/main/app/container';
import { openDataSet, prepareDataKey } from '../../src/main/app/dataSet';
import { SessionManager } from '../../src/main/auth/SessionManager';
import { BackupService } from '../../src/main/backup/BackupService';
import { AppPaths } from '../../src/main/core/paths';
import { DatabaseManager } from '../../src/main/db/connection';
import { isPlainDatabaseFile, openDatabase } from '../../src/main/db/driver';
import { migrationRunner } from '../../src/main/db/migrations';
import { TemplateInstaller } from '../../src/main/reports/TemplateInstaller';
import { DataEncryptor } from '../../src/main/security/DataEncryptor';
import { DataGate } from '../../src/main/security/DataGate';
import { DataVault, type KeyProtector } from '../../src/main/security/DataVault';
import { FileCipher, isEncryptedFile } from '../../src/main/security/FileCipher';

/**
 * Encryption at rest: the database, attachments and local copies are unreadable without the
 * key, the key opens by itself for the same Windows user (or with a PManager password when
 * Windows cannot), and moving data between computers keeps working.
 */

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
const LOGIN = 'komandyr';
const LOGIN_PASSWORD = 'Rota-Parol-2026';
const BACKUP_PASSWORD = 'Kopiya-Parol-2026';
const SOLDIER = 'Шевченко Тарас Григорович';
const TAX_ID = '3141592653';
const DOCUMENT = 'Витяг з наказу №17 — СЕКРЕТНИЙ-ВМІСТ';
const FIXTURE = path.resolve('fixtures/db/backup-2025-07-21T07-29-38-629Z.sqlite');

let root: string;
const openDatabases: DatabaseManager[] = [];

/** Stand-in for DPAPI: reversible, and it can "lose" its master key like a reset Windows password. */
function fakeWindows() {
    const state = { broken: false };
    const protector: KeyProtector = {
        available: () => true,
        protect: (data) => Buffer.concat([Buffer.from('WIN:'), data.map((b) => b ^ 0x5a)]),
        unprotect: (data) => {
            if (state.broken) throw new Error('The key is not valid for this Windows user');
            return Buffer.from(data.subarray(4).map((b) => b ^ 0x5a));
        },
    };
    return { protector, state };
}

/** What `main.ts` builds for the data set, on a temporary data folder. */
function dataSet(protector: KeyProtector, options: { finishOpening?: () => Promise<void> } = {}) {
    const vault = new DataVault(() => AppPaths.keystoreFile, protector);
    const cipher = new FileCipher(() => vault.fileKey());
    const encryptor = new DataEncryptor(() => vault.databaseKey(), cipher, silentLogger);
    const database = new DatabaseManager(
        () => AppPaths.database,
        () => vault.databaseKey(),
    );
    openDatabases.push(database);
    const templates = new TemplateInstaller(silentLogger);
    const backups = new BackupService({
        database,
        migrations: migrationRunner,
        sessions: new SessionManager(),
        templates,
        logger: silentLogger,
        appVersion: () => '0.0.0-test',
        instanceId: () => 'test-instance',
        vault,
        encryptor,
        finishOpening: options.finishOpening,
    });
    const container = {
        vault,
        encryptor,
        database,
        backups,
        templates,
        migrations: migrationRunner,
    } as unknown as Container;
    return { vault, cipher, encryptor, database, backups, container };
}

async function start(set: ReturnType<typeof dataSet>) {
    const key = await prepareDataKey(set.container, silentLogger);
    if (key.state === 'unlocked') await openDataSet(set.container, silentLogger);
    return key;
}

/** Every file under `dir` whose bytes contain `text` (UTF-8 or UTF-16LE). */
async function filesContaining(dir: string, text: string): Promise<string[]> {
    const needles = [Buffer.from(text, 'utf8'), Buffer.from(text, 'utf16le')];
    const hits: string[] = [];
    const walk = async (current: string) => {
        if (!fs.existsSync(current)) return;
        for (const item of await fsp.readdir(current, { withFileTypes: true })) {
            const full = path.join(current, item.name);
            if (item.isDirectory()) await walk(full);
            else if (needles.some((needle) => fs.readFileSync(full).includes(needle))) {
                hits.push(path.relative(dir, full));
            }
        }
    };
    await walk(dir);
    return hits;
}

beforeEach(async () => {
    root = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-encryption-'));
    app.setPath('userData', path.join(root, 'userData'));
    await fsp.mkdir(AppPaths.userData, { recursive: true });
});

afterEach(async () => {
    for (const database of openDatabases.splice(0)) {
        await database.close().catch((): void => undefined);
    }
    await fsp.rm(root, { recursive: true, force: true }).catch((): void => undefined);
});

describe('data key', () => {
    it('opens by itself for the same Windows user and is never stored in the clear', async () => {
        const { protector } = fakeWindows();
        const vault = new DataVault(() => AppPaths.keystoreFile, protector);
        await vault.create();
        const key = vault.exportKey();

        const nextStart = new DataVault(() => AppPaths.keystoreFile, protector);
        expect(await nextStart.load()).toBe('unlocked');
        expect(nextStart.exportKey().equals(key)).toBe(true);

        const stored = await fsp.readFile(AppPaths.keystoreFile, 'utf8');
        expect(stored).not.toContain(key.toString('hex'));
        expect(stored).not.toContain(key.toString('base64'));
    });

    it('opens with a PManager password when Windows cannot, and gives Windows a new copy', async () => {
        const windows = fakeWindows();
        const vault = new DataVault(() => AppPaths.keystoreFile, windows.protector);
        await vault.create();
        await vault.rememberAccount(LOGIN, LOGIN_PASSWORD);
        const key = vault.exportKey();

        windows.state.broken = true;
        const locked = new DataVault(() => AppPaths.keystoreFile, windows.protector);
        expect(await locked.load()).toBe('locked');
        expect(locked.databaseKey()).toBeNull();
        expect(await locked.unlockWithPassword(LOGIN, 'Wrong-Password-1')).toBe(false);
        expect(await locked.unlockWithPassword('someone-else', LOGIN_PASSWORD)).toBe(false);
        expect(await locked.unlockWithPassword(LOGIN, LOGIN_PASSWORD)).toBe(true);
        expect(locked.exportKey().equals(key)).toBe(true);

        windows.state.broken = false;
        const repaired = new DataVault(() => AppPaths.keystoreFile, windows.protector);
        expect(await repaired.load()).toBe('unlocked');
    });

    it('stops opening with the password of an account that was removed', async () => {
        const windows = fakeWindows();
        const vault = new DataVault(() => AppPaths.keystoreFile, windows.protector);
        await vault.create();
        await vault.rememberAccount(LOGIN, LOGIN_PASSWORD);
        await vault.forgetAccount(LOGIN);

        windows.state.broken = true;
        const locked = new DataVault(() => AppPaths.keystoreFile, windows.protector);
        await locked.load();
        expect(locked.hasPasswordCopies).toBe(false);
        expect(await locked.unlockWithPassword(LOGIN, LOGIN_PASSWORD)).toBe(false);
    });
});

describe('attachments and documents', () => {
    const cipher = new FileCipher(() => Buffer.alloc(32, 7));

    it('are unreadable on disk and come back byte for byte', () => {
        const encrypted = cipher.encrypt(Buffer.from(DOCUMENT));
        expect(isEncryptedFile(encrypted)).toBe(true);
        expect(encrypted.includes(Buffer.from(DOCUMENT))).toBe(false);
        expect(cipher.decrypt(encrypted).toString('utf8')).toBe(DOCUMENT);
    });

    it('refuse a file that was changed on disk', () => {
        const encrypted = cipher.encrypt(Buffer.from(DOCUMENT));
        encrypted[encrypted.length - 1] ^= 1;
        expect(() => cipher.decrypt(encrypted)).toThrow();
    });

    it('from older versions (unencrypted) are read as they are', () => {
        expect(cipher.decrypt(Buffer.from(DOCUMENT)).toString('utf8')).toBe(DOCUMENT);
    });
});

describe('first start of this version', () => {
    it('encrypts the data of an older version without losing a record', async () => {
        await fsp.copyFile(FIXTURE, AppPaths.database);
        const plain = openDatabase(AppPaths.database);
        const before = await plain.get<{ n: number }>(`SELECT COUNT(*) AS n FROM users`);
        const someone = await plain.get<{ fullName: string }>(
            `SELECT fullName FROM users WHERE length(fullName) > 8 LIMIT 1`,
        );
        await plain.close();
        expect(someone?.fullName).toBeTruthy();

        const attachment = path.join(AppPaths.historyFiles, '1', '1', 'рапорт.txt');
        await fsp.mkdir(path.dirname(attachment), { recursive: true });
        await fsp.writeFile(attachment, DOCUMENT);
        await fsp.mkdir(AppPaths.autoBackups, { recursive: true });
        await fsp.copyFile(FIXTURE, path.join(AppPaths.autoBackups, 'auto-2025-07-21.sqlite'));

        const set = dataSet(fakeWindows().protector);
        expect(await start(set)).toEqual({ state: 'unlocked', setAside: null });

        const db = await set.database.get();
        expect((await db.get(`SELECT COUNT(*) AS n FROM users`)).n).toBe(before?.n);
        expect(set.cipher.decrypt(await fsp.readFile(attachment)).toString('utf8')).toBe(DOCUMENT);
        await set.database.close();

        expect(isPlainDatabaseFile(AppPaths.database)).toBe(false);
        for (const text of [someone!.fullName, DOCUMENT]) {
            expect(await filesContaining(AppPaths.userData, text)).toEqual([]);
        }
    });

    it('finishes a file whose encryption was interrupted', async () => {
        const set = dataSet(fakeWindows().protector);
        await start(set);
        const dir = path.join(AppPaths.historyFiles, '5', '9');
        await fsp.mkdir(dir, { recursive: true });
        await fsp.writeFile(path.join(dir, 'a.txt'), DOCUMENT);
        await fsp.writeFile(
            path.join(dir, 'b.txt.encrypting'),
            set.cipher.encrypt(Buffer.from(DOCUMENT)),
        );

        expect(await set.encryptor.encryptFiles(AppPaths.historyFiles)).toBe(1);
        expect(await fsp.readdir(dir)).toEqual(['a.txt', 'b.txt']);
        for (const name of ['a.txt', 'b.txt']) {
            const bytes = await fsp.readFile(path.join(dir, name));
            expect(set.cipher.decrypt(bytes).toString('utf8')).toBe(DOCUMENT);
        }
    });
});

describe('start without the key', () => {
    it('waits for a PManager sign-in when Windows cannot open the key', async () => {
        const windows = fakeWindows();
        const first = dataSet(windows.protector);
        await start(first);
        await first.vault.rememberAccount(LOGIN, LOGIN_PASSWORD);
        await (
            await first.database.get()
        ).run(`INSERT INTO users (fullName, dateOfBirth) VALUES (?, ?)`, SOLDIER, '1990-03-09');
        await first.database.close();

        windows.state.broken = true;
        const second = dataSet(windows.protector);
        expect(await start(second)).toEqual({ state: 'locked' });
        await expect(second.database.get()).rejects.toMatchObject({ code: 'DATA_LOCKED' });

        const gate = new DataGate(second.vault, silentLogger);
        const opener = vi.fn(async () => {
            await openDataSet(second.container, silentLogger);
        });
        gate.onUnlock(opener);
        expect(gate.isLocked()).toBe(true);
        expect(await gate.unlock(LOGIN, 'Wrong-Password-1')).toBe(false);
        expect(opener).not.toHaveBeenCalled();
        expect(await gate.unlock(LOGIN, LOGIN_PASSWORD)).toBe(true);
        expect(opener).toHaveBeenCalledTimes(1);
        const row = await (await second.database.get()).get(`SELECT fullName FROM users`);
        expect(row).toEqual({ fullName: SOLDIER });
    });

    it('moves aside data that no key here can open, instead of deleting it', async () => {
        const first = dataSet(fakeWindows().protector);
        await start(first);
        await (
            await first.database.get()
        ).run(`INSERT INTO users (fullName, dateOfBirth) VALUES (?, ?)`, SOLDIER, '1990-03-09');
        await first.database.close();
        await fsp.rm(AppPaths.keystoreFile);

        const second = dataSet(fakeWindows().protector);
        const key = await start(second);
        expect(key.state).toBe('unlocked');
        const folder = (key as { setAside: string }).setAside;
        expect(folder.startsWith(AppPaths.backupsRoot)).toBe(true);
        expect(fs.existsSync(path.join(folder, 'users.db'))).toBe(true);
        const db = await second.database.get();
        expect((await db.get(`SELECT COUNT(*) AS n FROM users`)).n).toBe(0);
    });
});

describe('moving the data: backup → destroy → restore', () => {
    it('keeps everything unreadable at rest and brings the data back with its key', async () => {
        const windows = fakeWindows();
        const set = dataSet(windows.protector);
        await start(set);
        const db = await set.database.get();
        const { lastID } = await db.run(
            `INSERT INTO users (fullName, dateOfBirth, taxId) VALUES (?, ?, ?)`,
            SOLDIER,
            '1990-03-09',
            TAX_ID,
        );
        const document = path.join(AppPaths.historyFiles, String(lastID), '1001', 'наказ.txt');
        await fsp.mkdir(path.dirname(document), { recursive: true });
        await fsp.writeFile(document, set.cipher.encrypt(Buffer.from(DOCUMENT)));
        await set.backups.createAutoSnapshot(5);

        // Database, its write-ahead log, attachments and local copies: nothing readable.
        for (const text of [SOLDIER, TAX_ID, DOCUMENT]) {
            expect(await filesContaining(AppPaths.userData, text)).toEqual([]);
        }

        const key = set.vault.exportKey();
        const target = path.join(root, 'flash-drive', 'rota.pmb');
        await fsp.mkdir(path.dirname(target), { recursive: true });
        await set.backups.exportPackage(target, BACKUP_PASSWORD);

        await set.backups.resetAll({ destroyLocalCopies: true });
        // The old key went with the data: leftovers on the disk can no longer be decrypted.
        expect(set.vault.exportKey().equals(key)).toBe(false);

        await set.backups.selectImport(1, target);
        await set.backups.inspectImport(1, BACKUP_PASSWORD);
        await set.backups.restoreImport(1);
        expect(set.vault.exportKey().equals(key)).toBe(true);

        const restored = await set.database.get();
        expect(
            await restored.get(`SELECT fullName, taxId FROM users WHERE id = ?`, lastID),
        ).toEqual({ fullName: SOLDIER, taxId: TAX_ID });
        expect(set.cipher.decrypt(await fsp.readFile(document)).toString('utf8')).toBe(DOCUMENT);
        await set.database.close();
        for (const text of [SOLDIER, TAX_ID, DOCUMENT]) {
            expect(await filesContaining(AppPaths.userData, text)).toEqual([]);
        }

        // The next start of the app opens the restored data by itself.
        const nextStart = dataSet(windows.protector);
        expect(await start(nextStart)).toEqual({ state: 'unlocked', setAside: null });
        const again = await nextStart.database.get();
        expect((await again.get(`SELECT COUNT(*) AS n FROM users`)).n).toBe(1);
    });
});

describe('backups: the cases a unit runs into', () => {
    const target = () => path.join(root, 'flash-drive', 'rota.pmb');

    async function seededSet() {
        const set = dataSet(fakeWindows().protector);
        await start(set);
        const db = await set.database.get();
        await db.run(
            `INSERT INTO users (fullName, dateOfBirth, taxId) VALUES (?, ?, ?)`,
            SOLDIER,
            '1990-03-09',
            TAX_ID,
        );
        await fsp.mkdir(path.dirname(target()), { recursive: true });
        return set;
    }

    async function restore(set: ReturnType<typeof dataSet>, file: string, password: string) {
        await set.backups.selectImport(1, file);
        return set.backups.inspectImport(1, password);
    }

    it('keeps the administrator who restores, next to the accounts of the copy', async () => {
        const set = await seededSet();
        const db = await set.database.get();
        const role = await db.get<{ id: number }>(`SELECT id FROM roles WHERE is_system = 1`);
        for (const [uuid, username, hash] of [
            ['u-1', 'pysar', 'hash-from-copy'],
            ['u-2', 'komandyr', 'old-hash'],
        ]) {
            await db.run(
                `INSERT INTO accounts (uuid, username, display_name, password_hash, role_id)
                 VALUES (?, ?, '', ?, ?)`,
                uuid,
                username,
                hash,
                role!.id,
            );
        }
        await set.backups.exportPackage(target(), BACKUP_PASSWORD);
        await set.backups.resetAll({ destroyLocalCopies: true });

        await restore(set, target(), BACKUP_PASSWORD);
        await set.backups.restoreImport(1, {
            keepAccount: {
                username: 'novyi',
                displayName: 'Новий адміністратор',
                passwordHash: 'hash-of-novyi',
                recoveryCodeHash: null,
            },
        });
        const accounts = async () =>
            (await set.database.get()).all(
                `SELECT username, password_hash AS hash, role_id AS role FROM accounts ORDER BY username`,
            );
        expect(await accounts()).toEqual([
            { username: 'komandyr', hash: 'old-hash', role: role!.id },
            { username: 'novyi', hash: 'hash-of-novyi', role: role!.id },
            { username: 'pysar', hash: 'hash-from-copy', role: role!.id },
        ]);

        // The same login in the copy: it takes the password of the one who restores.
        await restore(set, target(), BACKUP_PASSWORD);
        await set.backups.restoreImport(1, {
            keepAccount: {
                username: 'komandyr',
                displayName: '',
                passwordHash: 'new-hash',
                recoveryCodeHash: null,
            },
        });
        expect((await accounts()).map((a: { hash: string }) => a.hash)).toEqual([
            'new-hash',
            'hash-from-copy',
        ]);
    });

    it('makes a copy right after everything was destroyed', async () => {
        const set = await seededSet();
        await set.backups.resetAll({ destroyLocalCopies: true });
        const exported = await set.backups.exportPackage(target(), BACKUP_PASSWORD);
        expect(exported.manifest.counts).toMatchObject({ personnel: 0, documents: 0 });
        expect((await restore(set, target(), BACKUP_PASSWORD)).personnelCount).toBe(0);
    });

    it('refuses a password that is guessed first, for copies and for sign-in', async () => {
        const set = await seededSet();
        for (const weak of [
            '12341234',
            '12345678',
            'qwertyui',
            'aaaaaaaa',
            '19900309',
            'password',
        ]) {
            await expect(set.backups.exportPackage(target(), weak)).rejects.toMatchObject({
                code: 'VALIDATION',
            });
        }
        expect(fs.existsSync(target())).toBe(false);
        const { PasswordPolicy } = await import('../../src/main/auth/PasswordHasher');
        expect(() => new PasswordPolicy().assertValid('12341234')).toThrow(/повторів/);
        expect(() => new PasswordPolicy().assertValid(LOGIN_PASSWORD)).not.toThrow();
    });

    it('restores the database file of an older version and encrypts it here', async () => {
        const set = await seededSet();
        const plain = openDatabase(FIXTURE);
        const expected = (await plain.get<{ n: number }>(`SELECT COUNT(*) AS n FROM users`))!.n;
        await plain.close();

        const inspection = await restore(set, FIXTURE, '');
        expect(inspection.personnelCount).toBe(expected);
        await set.backups.restoreImport(1);
        const db = await set.database.get();
        expect((await db.get(`SELECT COUNT(*) AS n FROM users`)).n).toBe(expected);
        await set.database.close();
        expect(isPlainDatabaseFile(AppPaths.database)).toBe(false);
    });

    it('refuses a damaged copy and leaves the data as it was', async () => {
        const set = await seededSet();
        await set.backups.exportPackage(target(), BACKUP_PASSWORD);
        const bytes = await fsp.readFile(target());
        await fsp.writeFile(target(), bytes.subarray(0, bytes.length - 100));

        await expect(restore(set, target(), BACKUP_PASSWORD)).rejects.toMatchObject({
            code: expect.stringMatching(/INVALID_PASSWORD|CORRUPTED/),
        });
        const db = await set.database.get();
        expect(await db.get(`SELECT fullName FROM users`)).toEqual({ fullName: SOLDIER });
    });

    it('puts the data and its key back when a restore fails half-way', async () => {
        const set = await seededSet();
        await set.backups.exportPackage(target(), BACKUP_PASSWORD);
        await set.backups.resetAll({ destroyLocalCopies: true });
        const db = await set.database.get();
        await db.run(
            `INSERT INTO users (fullName, dateOfBirth) VALUES ('Після очищення', '2000-01-01')`,
        );
        const keyBefore = set.vault.exportKey();

        await restore(set, target(), BACKUP_PASSWORD);
        const templates = (set.container as unknown as { templates: TemplateInstaller }).templates;
        vi.spyOn(templates, 'ensureInstalled').mockRejectedValueOnce(new Error('disk is full'));
        await expect(set.backups.restoreImport(1)).rejects.toThrow('disk is full');

        expect(set.vault.exportKey().equals(keyBefore)).toBe(true);
        const after = await set.database.get();
        expect(await after.all(`SELECT fullName FROM users`)).toEqual([
            { fullName: 'Після очищення' },
        ]);
        // And the next start still opens it.
        await set.database.close();
        const nextStart = dataSet(fakeWindows().protector);
        expect((await start(nextStart)).state).toBe('unlocked');
    });
});

describe('nobody can sign in any more', () => {
    async function seeded(protector: KeyProtector) {
        const set = dataSet(protector);
        await start(set);
        await set.vault.rememberAccount(LOGIN, LOGIN_PASSWORD);
        await (
            await set.database.get()
        ).run(
            `INSERT INTO users (fullName, dateOfBirth, taxId) VALUES (?, ?, ?)`,
            SOLDIER,
            '1990-03-09',
            TAX_ID,
        );
        await set.backups.createAutoSnapshot(5);
        return set;
    }

    /** A start where Windows cannot open the key: the data waits for a sign-in (main.ts). */
    async function lockedStart(protector: KeyProtector) {
        const gate: { current?: DataGate } = {};
        const set = dataSet(protector, { finishOpening: () => gate.current!.finishOpening() });
        expect(await start(set)).toEqual({ state: 'locked' });
        gate.current = new DataGate(set.vault, silentLogger);
        const opener = vi.fn(async () => {
            await openDataSet(set.container, silentLogger);
        });
        gate.current.onUnlock(opener);
        return { set, gate: gate.current, opener };
    }

    it('starts over with a new key; the old data and its key are set aside, not deleted', async () => {
        const windows = fakeWindows();
        const set = await seeded(windows.protector);
        const oldKey = set.vault.exportKey();

        const name = await set.backups.startOver();
        const folder = path.join(AppPaths.setAsideData, name);

        expect(set.vault.exportKey().equals(oldKey)).toBe(false);
        const db = await set.database.get();
        expect((await db.get(`SELECT COUNT(*) AS n FROM users`)).n).toBe(0);
        expect((await db.get(`SELECT COUNT(*) AS n FROM accounts`)).n).toBe(0);
        expect(fs.existsSync(AppPaths.autoBackups)).toBe(false);
        expect(fs.readdirSync(path.join(folder, 'backups', 'auto'))).toHaveLength(1);
        await set.database.close();
        expect(await filesContaining(AppPaths.userData, SOLDIER)).toEqual([]);

        // The old data still opens with the key that was moved next to it.
        const oldVault = new DataVault(() => path.join(folder, 'keystore.json'), windows.protector);
        expect(await oldVault.load()).toBe('unlocked');
        expect(oldVault.exportKey().equals(oldKey)).toBe(true);
        const aside = openDatabase(path.join(folder, 'users.db'), {
            readonly: true,
            key: oldKey.toString('hex'),
        });
        expect(await aside.get(`SELECT fullName FROM users`)).toEqual({ fullName: SOLDIER });
        await aside.close();

        // The next start opens the new, empty data set by itself.
        const nextStart = dataSet(windows.protector);
        expect(await start(nextStart)).toEqual({ state: 'unlocked', setAside: null });
    });

    it('starts over while Windows cannot open the key, and finishes the start-up', async () => {
        const windows = fakeWindows();
        await (await seeded(windows.protector)).database.close();
        windows.state.broken = true;
        const { set, gate, opener } = await lockedStart(windows.protector);

        const name = await set.backups.startOver();

        expect(opener).toHaveBeenCalledTimes(1);
        expect(gate.isLocked()).toBe(false);
        const db = await set.database.get();
        expect((await db.get(`SELECT COUNT(*) AS n FROM users`)).n).toBe(0);
        // Whoever remembers the old password later can still open the data set aside.
        const oldVault = new DataVault(
            () => path.join(AppPaths.setAsideData, name, 'keystore.json'),
            windows.protector,
        );
        expect(await oldVault.load()).toBe('locked');
        expect(await oldVault.unlockWithPassword(LOGIN, LOGIN_PASSWORD)).toBe(true);
    });

    it('restores a backup while Windows cannot open the key', async () => {
        const windows = fakeWindows();
        const first = await seeded(windows.protector);
        const target = path.join(root, 'flash-drive', 'rota.pmb');
        await fsp.mkdir(path.dirname(target), { recursive: true });
        await first.backups.exportPackage(target, BACKUP_PASSWORD);
        const key = first.vault.exportKey();
        await first.database.close();
        windows.state.broken = true;
        const { set, opener } = await lockedStart(windows.protector);

        await set.backups.selectImport(1, target);
        expect((await set.backups.inspectImport(1, BACKUP_PASSWORD)).personnelCount).toBe(1);
        await set.backups.restoreImport(1, {
            keepAccount: {
                username: 'novyi',
                displayName: 'novyi',
                passwordHash: 'hash-of-novyi',
                recoveryCodeHash: null,
            },
        });

        expect(opener).toHaveBeenCalledTimes(1);
        expect(set.vault.exportKey().equals(key)).toBe(true);
        const db = await set.database.get();
        expect(await db.get(`SELECT fullName FROM users`)).toEqual({ fullName: SOLDIER });
        expect(await db.all(`SELECT username FROM accounts`)).toEqual([{ username: 'novyi' }]);
    });
});
