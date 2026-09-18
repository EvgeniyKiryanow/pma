import { app } from 'electron';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionManager } from '../../src/main/auth/SessionManager';
import { BackupService } from '../../src/main/backup/BackupService';
import { AppPaths } from '../../src/main/core/paths';
import { DatabaseManager } from '../../src/main/db/connection';
import { migrationRunner } from '../../src/main/db/migrations';
import { TemplateInstaller } from '../../src/main/reports/TemplateInstaller';

/**
 * The main flow of moving a unit's data: full encrypted backup → everything destroyed on
 * this computer → restored from the backup. Runs against a real database and real files in
 * a temporary data folder.
 */

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
const PASSWORD = 'Kopiya-Parol-2026';
const SOLDIER = 'Шевченко Тарас Григорович';
const TAX_ID = '3141592653';
const DOCUMENT = 'Витяг з наказу №17 — СЕКРЕТНИЙ-ВМІСТ';

let root: string;
let database: DatabaseManager;
let backups: BackupService;
let clearBrowserData: ReturnType<typeof vi.fn>;

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

async function seedData(): Promise<number> {
    const db = await database.get();
    const result = await db.run(
        `INSERT INTO users (fullName, dateOfBirth, taxId) VALUES (?, ?, ?)`,
        SOLDIER,
        '1990-03-09',
        TAX_ID,
    );
    const id = Number(result.lastID);
    const entryDir = path.join(AppPaths.historyFiles, String(id), '1001');
    await fsp.mkdir(entryDir, { recursive: true });
    await fsp.writeFile(path.join(entryDir, 'наказ.txt'), DOCUMENT);
    return id;
}

beforeEach(async () => {
    root = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-backup-'));
    app.setPath('userData', path.join(root, 'userData'));
    await fsp.mkdir(AppPaths.userData, { recursive: true });

    database = new DatabaseManager();
    await migrationRunner.run(await database.get());
    clearBrowserData = vi.fn(async () => undefined);
    backups = new BackupService({
        database,
        migrations: migrationRunner,
        sessions: new SessionManager(),
        templates: new TemplateInstaller(silentLogger),
        logger: silentLogger,
        appVersion: () => '0.0.0-test',
        instanceId: () => 'test-instance',
        clearBrowserData,
    });
});

afterEach(async () => {
    await database.close().catch((): void => undefined);
    await fsp.rm(root, { recursive: true, force: true }).catch((): void => undefined);
});

describe('full reset', () => {
    it('keeps the previous data in a safety copy by default', async () => {
        await seedData();
        const result = await backups.resetAll();

        expect(result.safetySnapshot).toBeTruthy();
        const db = await database.get();
        expect((await db.get(`SELECT COUNT(*) AS n FROM users`)).n).toBe(0);
        const safety = path.join(AppPaths.safetyBackups, result.safetySnapshot as string);
        expect(await filesContaining(safety, DOCUMENT)).toEqual([
            path.join('history_files', '1', '1001', 'наказ.txt'),
        ]);
        expect(clearBrowserData).toHaveBeenCalled();
    });

    it('destroys the data and every local copy when asked, leaving nothing readable', async () => {
        await seedData();
        await backups.createAutoSnapshot(5);
        await backups.createSafetyDatabaseSnapshot('before-test');

        const result = await backups.resetAll({ destroyLocalCopies: true });

        expect(result.safetySnapshot).toBeNull();
        expect(result.destroyedFiles).toBeGreaterThan(0);
        expect(fs.existsSync(AppPaths.backupsRoot)).toBe(false);
        const db = await database.get();
        expect((await db.get(`SELECT COUNT(*) AS n FROM users`)).n).toBe(0);
        // Not a single file of the data folder still holds the name, tax id or document.
        await database.close();
        for (const text of [SOLDIER, TAX_ID, DOCUMENT]) {
            expect(await filesContaining(AppPaths.userData, text)).toEqual([]);
        }
    });
});

describe('backup → destroy → restore', () => {
    it('brings back every record and document, and only with the right password', async () => {
        const id = await seedData();
        const target = path.join(root, 'flash-drive', 'rota.pmb');
        await fsp.mkdir(path.dirname(target), { recursive: true });

        const exported = await backups.exportPackage(target, PASSWORD);
        expect(exported.manifest.counts.personnel).toBe(1);
        // The file on the flash drive is encrypted: nothing in it is readable.
        for (const text of [SOLDIER, TAX_ID, DOCUMENT]) {
            expect(await filesContaining(path.dirname(target), text)).toEqual([]);
        }

        await backups.resetAll({ destroyLocalCopies: true });

        await backups.selectImport(1, target);
        await expect(backups.inspectImport(1, 'Wrong-Password-1')).rejects.toMatchObject({
            code: 'INVALID_PASSWORD',
        });
        const inspection = await backups.inspectImport(1, PASSWORD);
        expect(inspection.personnelCount).toBe(1);
        await backups.restoreImport(1);

        const db = await database.get();
        const soldier = await db.get(`SELECT fullName, taxId FROM users WHERE id = ?`, id);
        expect(soldier).toEqual({ fullName: SOLDIER, taxId: TAX_ID });
        const document = path.join(AppPaths.historyFiles, String(id), '1001', 'наказ.txt');
        expect(await fsp.readFile(document, 'utf8')).toBe(DOCUMENT);
        // The decrypted working copy of the import is gone.
        expect(await filesContaining(AppPaths.staging, DOCUMENT)).toEqual([]);
    });
});

describe('start-up clean-up', () => {
    it('destroys leftovers of an interrupted operation', async () => {
        const leftover = path.join(AppPaths.staging, 'export-crashed', 'archive.bin');
        await fsp.mkdir(path.dirname(leftover), { recursive: true });
        await fsp.writeFile(leftover, DOCUMENT);

        await backups.purgeStaging();
        expect(fs.existsSync(AppPaths.staging)).toBe(false);
    });
});
