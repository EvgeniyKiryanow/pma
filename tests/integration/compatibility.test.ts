import { app } from 'electron';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Container } from '../../src/main/app/container';
import { openDataSet, prepareDataKey } from '../../src/main/app/dataSet';
import { PasswordHasher } from '../../src/main/auth/PasswordHasher';
import { SessionManager } from '../../src/main/auth/SessionManager';
import { BackupService } from '../../src/main/backup/BackupService';
import { decryptPackage, encryptFile } from '../../src/main/backup/crypto';
import { AppPaths } from '../../src/main/core/paths';
import { DatabaseManager } from '../../src/main/db/connection';
import { migrationRunner } from '../../src/main/db/migrations';
import { TemplateInstaller } from '../../src/main/reports/TemplateInstaller';
import { DataEncryptor } from '../../src/main/security/DataEncryptor';
import { DataGate } from '../../src/main/security/DataGate';
import { DataVault, type KeyProtector } from '../../src/main/security/DataVault';
import { FileCipher } from '../../src/main/security/FileCipher';

/**
 * «Versions must not break anything»: every release that changed a data format left a backup
 * and a data folder in fixtures/compat/<version>. This version must restore each backup and
 * open each data folder (as after an update), with every record and document intact.
 * Fixtures are written by tests/compat/make-fixtures.test.ts and never rewritten.
 */

type Expected = {
    version: string;
    backupPassword: string;
    account: { username: string; password: string };
    positions: { shtat_number: string }[];
    people: { fullName: string; soldierStatus: string; shpkNumber: string | null }[];
    document: { person: string; entryId: number; name: string; text: string };
};

const COMPAT = path.resolve('fixtures/compat');
const RELEASES = fs
    .readdirSync(COMPAT, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name);
const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

/** Windows cannot open the key here (another computer): only the account password can. */
const noWindows: KeyProtector = {
    available: () => false,
    protect: () => Buffer.alloc(0),
    unprotect: () => {
        throw new Error('not this Windows user');
    },
};

let root: string;
const databases: DatabaseManager[] = [];

function dataSet() {
    const vault = new DataVault(() => AppPaths.keystoreFile, noWindows);
    const cipher = new FileCipher(() => vault.fileKey());
    const encryptor = new DataEncryptor(() => vault.databaseKey(), cipher, silentLogger);
    const database = new DatabaseManager(
        () => AppPaths.database,
        () => vault.databaseKey(),
    );
    databases.push(database);
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
    });
    const container = {
        vault,
        encryptor,
        database,
        backups,
        templates,
        migrations: migrationRunner,
    } as unknown as Container;
    return { vault, cipher, database, backups, container };
}

async function expectEverything(
    set: ReturnType<typeof dataSet>,
    expected: Expected,
): Promise<void> {
    const db = await set.database.get();
    const people = await db.all<{ fullName: string; soldierStatus: string; shpkNumber: string }[]>(
        `SELECT fullName, soldierStatus, shpkNumber FROM users ORDER BY fullName`,
    );
    expect(people).toEqual(
        [...expected.people]
            .sort((a, b) => a.fullName.localeCompare(b.fullName))
            .map(({ fullName, soldierStatus, shpkNumber }) => ({
                fullName,
                soldierStatus,
                shpkNumber,
            })),
    );
    expect((await db.get(`SELECT COUNT(*) AS n FROM shtatni_posady`)).n).toBe(
        expected.positions.length,
    );
    expect(await migrationRunner.currentVersion(db)).toBe(migrationRunner.latestVersion);

    const account = await db.get<{ password_hash: string }>(
        `SELECT password_hash FROM accounts WHERE username = ?`,
        expected.account.username,
    );
    expect(
        await new PasswordHasher().verify(expected.account.password, account?.password_hash),
    ).toBe(true);

    const owner = await db.get<{ id: number; history: string }>(
        `SELECT id, history FROM users WHERE fullName = ?`,
        expected.document.person,
    );
    const entry = JSON.parse(owner!.history).find(
        (e: { id: number }) => e.id === expected.document.entryId,
    );
    expect(entry.files.map((f: { name: string }) => f.name)).toEqual([expected.document.name]);
    const file = path.join(
        AppPaths.historyFiles,
        String(owner!.id),
        String(expected.document.entryId),
        expected.document.name,
    );
    expect(set.cipher.decrypt(await fsp.readFile(file)).toString('utf8')).toBe(
        expected.document.text,
    );
}

beforeEach(async () => {
    root = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-compat-'));
    app.setPath('userData', path.join(root, 'userData'));
    await fsp.mkdir(AppPaths.userData, { recursive: true });
});

afterEach(async () => {
    for (const database of databases.splice(0)) await database.close().catch(() => undefined);
    await fsp.rm(root, { recursive: true, force: true }).catch(() => undefined);
});

describe.each(RELEASES)('data written by %s', (release) => {
    const folder = path.join(COMPAT, release);
    const expected = JSON.parse(
        fs.readFileSync(path.join(folder, 'expected.json'), 'utf8'),
    ) as Expected;

    it('restores its full backup, on a new computer', async () => {
        const set = dataSet();
        const key = await prepareDataKey(set.container, silentLogger);
        expect(key.state).toBe('unlocked');
        await openDataSet(set.container, silentLogger);

        await set.backups.selectImport(1, path.join(folder, 'backup.pmb'));
        const inspection = await set.backups.inspectImport(1, expected.backupPassword);
        expect(inspection.personnelCount).toBe(expected.people.length);
        await set.backups.restoreImport(1);
        await expectEverything(set, expected);
    });

    it('restores it even with a password older versions accepted', async () => {
        // Same package, re-encrypted with a password the current rules refuse for new copies.
        const plain = path.join(root, 'archive.bin');
        const weak = path.join(root, 'weak.pmb');
        await decryptPackage(path.join(folder, 'backup.pmb'), plain, expected.backupPassword);
        await encryptFile(plain, weak, '12341234');

        const set = dataSet();
        await prepareDataKey(set.container, silentLogger);
        await openDataSet(set.container, silentLogger);
        await set.backups.selectImport(1, weak);
        await set.backups.inspectImport(1, '12341234');
        await set.backups.restoreImport(1);
        await expectEverything(set, expected);
    });

    it('opens its data folder after an update to this version', async () => {
        await fsp.cp(path.join(folder, 'data'), AppPaths.userData, { recursive: true });
        const set = dataSet();
        expect(await prepareDataKey(set.container, silentLogger)).toEqual({ state: 'locked' });

        const gate = new DataGate(set.vault, silentLogger);
        gate.onUnlock(async () => {
            await openDataSet(set.container, silentLogger);
        });
        expect(await gate.unlock(expected.account.username, expected.account.password)).toBe(true);
        await expectEverything(set, expected);
    });
});
