import { app } from 'electron';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, it } from 'vitest';

import { PasswordHasher } from '../../src/main/auth/PasswordHasher';
import { SessionManager } from '../../src/main/auth/SessionManager';
import { BackupService } from '../../src/main/backup/BackupService';
import { AppPaths } from '../../src/main/core/paths';
import { DatabaseManager } from '../../src/main/db/connection';
import { migrationRunner } from '../../src/main/db/migrations';
import { HistoryAttachments } from '../../src/main/personnel/HistoryAttachments';
import { TemplateInstaller } from '../../src/main/reports/TemplateInstaller';
import { DataEncryptor } from '../../src/main/security/DataEncryptor';
import { DataVault } from '../../src/main/security/DataVault';
import { FileCipher } from '../../src/main/security/FileCipher';

/**
 * Writes the compatibility fixtures of the current release: a full backup and a data folder
 * exactly as this version produces them (synthetic people only). Every later version must
 * restore and open them — tests/integration/compatibility.test.ts reads every folder under
 * fixtures/compat. Run once per release that changes a format, never over an existing folder:
 *
 *   PMA_MAKE_FIXTURES=v2.0.0 npx vitest run tests/compat/make-fixtures.test.ts
 */
const VERSION = process.env.PMA_MAKE_FIXTURES;
const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

const EXPECTED = {
    backupPassword: 'Sumisnist-Kopii-2026',
    account: { username: 'fixture', password: 'Fixture-Parol-2026' },
    positions: [
        {
            shtat_number: '001',
            unit_name: 'Управління\r\nроти',
            position_name: 'Командир роти',
            category: 'оф',
        },
        {
            shtat_number: '010',
            unit_name: '1 взвод\r\n1 відділення',
            position_name: 'Стрілець',
            category: 'солд',
        },
        {
            shtat_number: '011',
            unit_name: '1 взвод\r\n1 відділення',
            position_name: 'Кулеметник',
            category: 'солд',
        },
    ],
    people: [
        {
            fullName: 'Сумісний Андрій Петрович',
            dateOfBirth: '1990-01-15',
            rank: 'капітан',
            soldierStatus: 'Управління',
            shpkNumber: '001',
        },
        {
            fullName: 'Сумісний Богдан Іванович',
            dateOfBirth: '1995-06-01',
            rank: 'солдат',
            soldierStatus: 'Позиція піхоти',
            shpkNumber: '010',
        },
        {
            fullName: 'Сумісний Василь Олегович',
            dateOfBirth: '1998-11-30',
            rank: 'солдат',
            soldierStatus: 'Відпустка',
            shpkNumber: null,
        },
    ],
    document: {
        person: 'Сумісний Богдан Іванович',
        entryId: 1789000000001,
        name: 'довідка.txt',
        text: 'Документ версії, що створила ці дані: має читатися в усіх наступних версіях.',
    },
};

describe.skipIf(!VERSION)('compatibility fixtures', () => {
    it(`writes fixtures/compat/${VERSION}`, async () => {
        const target = path.resolve('fixtures/compat', String(VERSION));
        if (fs.existsSync(target))
            throw new Error(`${target} exists: fixtures of a release are never rewritten`);

        const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-compat-'));
        app.setPath('userData', path.join(root, 'userData'));
        await fsp.mkdir(AppPaths.userData, { recursive: true });

        // No Windows copy of the key: the fixture must open on any computer, with the password.
        const vault = new DataVault(() => AppPaths.keystoreFile, {
            available: () => false,
            protect: () => Buffer.alloc(0),
            unprotect: () => Buffer.alloc(0),
        });
        await vault.create();
        await vault.rememberAccount(EXPECTED.account.username, EXPECTED.account.password);
        const cipher = new FileCipher(() => vault.fileKey());
        const database = new DatabaseManager(
            () => AppPaths.database,
            () => vault.databaseKey(),
        );
        const db = await database.get();
        await migrationRunner.run(db);

        const role = await db.get<{ id: number }>(`SELECT id FROM roles WHERE is_system = 1`);
        await db.run(
            `INSERT INTO accounts (uuid, username, display_name, password_hash, role_id)
             VALUES ('compat-account-1', ?, 'Перевірка сумісності', ?, ?)`,
            EXPECTED.account.username,
            await new PasswordHasher().hash(EXPECTED.account.password),
            role!.id,
        );
        for (const pos of EXPECTED.positions) {
            await db.run(
                `INSERT INTO shtatni_posady (shtat_number, unit_name, position_name, category) VALUES (?, ?, ?, ?)`,
                pos.shtat_number,
                pos.unit_name,
                pos.position_name,
                pos.category,
            );
        }
        const attachments = new HistoryAttachments(
            () => AppPaths.historyFiles,
            silentLogger,
            cipher,
        );
        for (const person of EXPECTED.people) {
            const pos = EXPECTED.positions.find((p) => p.shtat_number === person.shpkNumber);
            const { lastID } = await db.run(
                `INSERT INTO users (fullName, dateOfBirth, rank, soldierStatus, shpkNumber, position, unitMain, category)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                person.fullName,
                person.dateOfBirth,
                person.rank,
                person.soldierStatus,
                person.shpkNumber,
                pos?.position_name ?? null,
                pos?.unit_name ?? null,
                pos?.category ?? null,
            );
            if (person.fullName !== EXPECTED.document.person) continue;
            const content = Buffer.from(EXPECTED.document.text, 'utf8');
            const files = await attachments.save(lastID, EXPECTED.document.entryId, [
                {
                    name: EXPECTED.document.name,
                    type: 'text/plain',
                    size: content.length,
                    dataUrl: `data:text/plain;base64,${content.toString('base64')}`,
                },
            ]);
            const entry = {
                id: EXPECTED.document.entryId,
                date: '2026-09-18T10:00:00.000Z',
                type: 'history',
                author: EXPECTED.account.username,
                description: 'Запис з документом',
                content: '',
                files,
            };
            await db.run(
                `UPDATE users SET history = ? WHERE id = ?`,
                JSON.stringify([entry]),
                lastID,
            );
        }

        const backups = new BackupService({
            database,
            migrations: migrationRunner,
            sessions: new SessionManager(),
            templates: new TemplateInstaller(silentLogger),
            logger: silentLogger,
            appVersion: () => String(VERSION).replace(/^v/, ''),
            instanceId: () => 'compat-fixture',
            vault,
            encryptor: new DataEncryptor(() => vault.databaseKey(), cipher, silentLogger),
        });
        await fsp.mkdir(target, { recursive: true });
        await backups.exportPackage(path.join(target, 'backup.pmb'), EXPECTED.backupPassword);
        await database.close();

        const data = path.join(target, 'data');
        await fsp.mkdir(data, { recursive: true });
        await fsp.copyFile(AppPaths.database, path.join(data, 'users.db'));
        await fsp.copyFile(AppPaths.keystoreFile, path.join(data, 'keystore.json'));
        await fsp.cp(AppPaths.historyFiles, path.join(data, 'history_files'), { recursive: true });
        await fsp.writeFile(
            path.join(target, 'expected.json'),
            `${JSON.stringify({ version: VERSION, ...EXPECTED }, null, 2)}\n`,
        );
        await fsp.rm(root, { recursive: true, force: true });
    });
});
