import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { openDatabase } from '../../src/main/db/driver';
import { migrationRunner } from '../../src/main/db/migrations';
import type { Db } from '../../src/main/db/types';

const FIXTURES = path.resolve('fixtures/db');
let workDir: string;

beforeAll(async () => {
    workDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-migrations-'));
});

afterAll(async () => {
    // Windows keeps a handle for a moment after close; retry instead of failing the suite.
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            await fsp.rm(workDir, { recursive: true, force: true });
            return;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }
});

async function openDb(file: string): Promise<Db> {
    const db = openDatabase(file);
    await db.exec('PRAGMA foreign_keys = ON');
    return db;
}

type Snapshot = { hashes: Record<string, string>; columns: Record<string, string[]> };

/**
 * Hash of every row of every table, so migrations can be checked for data loss.
 * Migrations add columns (uuid, created_at…), so a later snapshot is taken over the same
 * columns as the earlier one — otherwise the comparison would fail for a harmless addition.
 */
async function snapshot(db: Db, skip: string[] = [], only?: Record<string, string[]>): Promise<Snapshot> {
    const tables: { name: string }[] = await db.all(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    );
    const result: Snapshot = { hashes: {}, columns: {} };
    for (const { name } of tables) {
        if (skip.includes(name)) continue;
        if (only && !only[name]) continue;
        const existing: { name: string }[] = await db.all(`PRAGMA table_info("${name}")`);
        const names = only?.[name] ?? existing.map((column) => column.name);
        const list = names.map((column) => `"${column}"`).join(', ');
        // Sorted in JS: some tables are WITHOUT ROWID, so ORDER BY rowid is not available.
        const rows: unknown[] = await db.all(`SELECT ${list} FROM "${name}"`);
        const sorted = rows.map((row) => JSON.stringify(row)).sort();
        result.hashes[name] = crypto.createHash('sha256').update(sorted.join('\n')).digest('hex');
        result.columns[name] = names;
    }
    return result;
}

const LEGACY_TABLES = ['auth_user', 'default_admin', 'superuser', 'roles', 'legacy_roles'];

describe('migrations on a fresh database', () => {
    it('creates the current schema and an administrator role', async () => {
        const db = await openDb(path.join(workDir, 'fresh.db'));
        const report = await migrationRunner.run(db);

        expect(report.from).toBe(0);
        expect(report.to).toBe(migrationRunner.latestVersion);
        expect(await migrationRunner.currentVersion(db)).toBe(migrationRunner.latestVersion);

        const roles = await db.all(`SELECT name, is_system, grants_all FROM roles`);
        expect(roles).toHaveLength(1);
        expect(roles[0]).toMatchObject({ is_system: 1, grants_all: 1 });

        // No accounts: the application shows the first-run setup screen.
        expect((await db.get(`SELECT COUNT(*) AS n FROM accounts`)).n).toBe(0);

        // The index that used to crash a fresh install exists now.
        const index = await db.get(
            `SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_users_shpk'`,
        );
        expect(index).toBeTruthy();
        await db.close();
    });

    it('is idempotent: a second start applies nothing', async () => {
        const file = path.join(workDir, 'twice.db');
        let db = await openDb(file);
        await migrationRunner.run(db);
        const before = await snapshot(db);
        await db.close();

        db = await openDb(file);
        const report = await migrationRunner.run(db);
        expect(report.applied).toEqual([]);
        expect((await snapshot(db, [], before.columns)).hashes).toEqual(before.hashes);
        await db.close();
    });

    it('refuses a database created by a newer version', async () => {
        const file = path.join(workDir, 'future.db');
        const db = await openDb(file);
        await migrationRunner.run(db);
        await db.exec(`PRAGMA user_version = 999`);

        await expect(migrationRunner.run(db)).rejects.toMatchObject({ code: 'SCHEMA_TOO_NEW' });
        await db.close();
    });
});

const fixtures = fs.existsSync(FIXTURES)
    ? fs.readdirSync(FIXTURES).filter((f) => f.endsWith('.sqlite'))
    : [];

describe.each(fixtures)('migration of the real database %s', (fixture) => {
    it('keeps every row and upgrades the schema', async () => {
        const file = path.join(workDir, fixture);
        await fsp.copyFile(path.join(FIXTURES, fixture), file);

        const before = await openDb(file);
        const dataBefore = await snapshot(before, LEGACY_TABLES);
        const legacyUsers = await before.all(`SELECT username, password FROM auth_user`);
        const personnel = (await before.get(`SELECT COUNT(*) AS n FROM users`)).n;
        await before.close();

        const db = await openDb(file);
        try {
        const report = await migrationRunner.run(db);
        expect(report.from).toBe(0);
        expect(report.to).toBe(migrationRunner.latestVersion);

        // Data of existing tables is untouched (compared over the pre-migration columns).
        expect((await snapshot(db, LEGACY_TABLES, dataBefore.columns)).hashes).toEqual(
            dataBefore.hashes,
        );
        expect((await db.get(`SELECT COUNT(*) AS n FROM users`)).n).toBe(personnel);

        // Accounts moved over with their password hashes.
        for (const legacy of legacyUsers) {
            const account = await db.get(
                `SELECT password_hash FROM accounts WHERE username = ?`,
                legacy.username.toLowerCase(),
            );
            expect(account?.password_hash).toBe(legacy.password);
        }

        // At least one administrator exists, otherwise the install could not be managed.
        const admins = await db.get(
            `SELECT COUNT(*) AS n FROM accounts a JOIN roles r ON r.id = a.role_id WHERE r.grants_all = 1`,
        );
        expect(admins.n).toBeGreaterThan(0);

        // Legacy auth tables (including the hardcoded superuser) are gone.
        const leftovers = await db.all(
            `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('auth_user', 'default_admin', 'superuser', 'legacy_roles')`,
        );
        expect(leftovers).toEqual([]);

        // Every record has a uuid and timestamps for future data exchange.
        expect((await db.get(`SELECT COUNT(*) AS n FROM users WHERE uuid IS NULL`)).n).toBe(0);
        expect((await db.get(`SELECT COUNT(*) AS n FROM users WHERE updated_at IS NULL`)).n).toBe(0);

        // The card of Impulse (v10): the lists start empty, the new columns exist.
        expect(await db.all(`SELECT DISTINCT awardRecords, educationList FROM users`)).toEqual(
            personnel ? [{ awardRecords: '[]', educationList: '[]' }] : [],
        );
        const columns = (await db.all(`PRAGMA table_info(users)`)).map((c: { name: string }) => c.name);
        expect(columns).toEqual(expect.arrayContaining(['passportSeries', 'iban', 'oathDate']));

        const integrity = await db.get(`PRAGMA integrity_check`);
        expect(integrity.integrity_check).toBe('ok');
        } finally {
            await db.close();
        }
    });

    it('fills uuid and timestamps for rows inserted afterwards', async () => {
        const file = path.join(workDir, `after-${fixture}`);
        await fsp.copyFile(path.join(FIXTURES, fixture), file);
        const db = await openDb(file);
        try {
            await migrationRunner.run(db);

            // Early versions declared fullName/dateOfBirth NOT NULL, so this insert failed on
            // old installs while working on fresh ones. Migration 6 harmonizes that.
            const result = await db.run(`INSERT INTO users (fullName) VALUES ('Тестова Особа')`);
            const row = await db.get(
                `SELECT uuid, created_at, updated_at FROM users WHERE id = ?`,
                result.lastID,
            );
            expect(row.uuid).toMatch(/^[0-9a-f-]{36}$/);
            expect(row.created_at).toBeTruthy();
            expect(row.updated_at).toBeTruthy();

            await db.run(`UPDATE users SET fullName = 'Інша Особа' WHERE id = ?`, result.lastID);
            const updated = await db.get(`SELECT uuid, updated_at FROM users WHERE id = ?`, result.lastID);
            expect(updated.uuid).toBe(row.uuid); // uuid never changes
            expect(updated.updated_at >= row.updated_at).toBe(true);

            // The JSON validation trigger survived the table rebuild.
            await expect(
                db.run(`UPDATE users SET relatives = 'не json' WHERE id = ?`, result.lastID),
            ).rejects.toThrow();
        } finally {
            await db.close();
        }
    });
});

describe('migration of a v1.6 database with roles and a default admin', () => {
    it('maps tabs to permissions, keeps the admin and renames a clashing login', async () => {
        const file = path.join(workDir, 'v16.db');
        const db = await openDb(file);

        // Recreate what v1.6 produced.
        await db.exec(`
            CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, fullName TEXT, shpkNumber TEXT);
            CREATE TABLE auth_user (
                id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
                recovery_hint TEXT, role TEXT DEFAULT 'user', key TEXT, role_id INTEGER
            );
            CREATE TABLE roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT DEFAULT '', allowed_tabs TEXT NOT NULL);
            CREATE TABLE default_admin (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, recovery_hint TEXT, key TEXT NOT NULL, app_key TEXT);
            CREATE TABLE superuser (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, key TEXT NOT NULL);
        `);
        await db.run(`INSERT INTO users (fullName, shpkNumber) VALUES ('Тестова Особа', '1')`);
        await db.run(
            `INSERT INTO roles (name, description, allowed_tabs) VALUES ('admin', 'Full access', ?), ('user', 'Limited', ?), ('Діловод', 'custom', ?)`,
            JSON.stringify(['manager', 'reports', 'backups', 'admin']),
            JSON.stringify(['manager', 'instructions']),
            JSON.stringify(['manager', 'reports']),
        );
        await db.run(
            `INSERT INTO auth_user (username, password, role, role_id) VALUES ('boss', 'hash-boss', 'admin', 1), ('clerk', 'hash-clerk', 'user', 3), ('Admin', 'hash-clash', 'user', 2)`,
        );
        await db.run(
            `INSERT INTO default_admin (username, password, key) VALUES ('admin', 'hash-admin', 'k')`,
        );
        await db.run(`INSERT INTO superuser (username, password, key) VALUES ('superuser', 'hash-su', 'k')`);

        await migrationRunner.run(db);

        const accounts = await db.all(
            `SELECT a.username, r.name AS role, r.grants_all FROM accounts a JOIN roles r ON r.id = a.role_id ORDER BY a.id`,
        );
        const byName = Object.fromEntries(accounts.map((a) => [a.username, a]));

        expect(byName['admin']).toMatchObject({ grants_all: 1 }); // default admin stays an admin
        expect(byName['boss']).toMatchObject({ grants_all: 1 }); // text role "admin"
        expect(byName['clerk'].role).toBe('Діловод'); // custom role kept by name
        expect(byName['admin_1']).toBeTruthy(); // clashing login renamed, not dropped
        expect(accounts).toHaveLength(4);

        // Tab-based access became permissions.
        const clerkPermissions = await db.all(
            `SELECT permission FROM role_permissions p JOIN roles r ON r.id = p.role_id WHERE r.name = 'Діловод' ORDER BY permission`,
        );
        const keys = clerkPermissions.map((p) => p.permission);
        expect(keys).toContain('personnel.view');
        expect(keys).toContain('reports.view');
        expect(keys).not.toContain('accounts.manage'); // no admin tab → no administration

        // The system administrator role holds no explicit rows: it grants everything.
        const adminPermissions = await db.all(
            `SELECT permission FROM role_permissions p JOIN roles r ON r.id = p.role_id WHERE r.grants_all = 1`,
        );
        expect(adminPermissions).toEqual([]);

        expect((await db.get(`SELECT COUNT(*) AS n FROM users`)).n).toBe(1);
        await db.close();
    });

    it('promotes the oldest account when the install had no administrator', async () => {
        const file = path.join(workDir, 'no-admin.db');
        const db = await openDb(file);
        await db.exec(`
            CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, fullName TEXT);
            CREATE TABLE auth_user (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, recovery_hint TEXT);
        `);
        await db.run(`INSERT INTO auth_user (username, password) VALUES ('first', 'h1'), ('second', 'h2')`);

        await migrationRunner.run(db);

        const admins = await db.all(
            `SELECT a.username FROM accounts a JOIN roles r ON r.id = a.role_id WHERE r.grants_all = 1`,
        );
        expect(admins.map((a) => a.username)).toEqual(['first']);
        await db.close();
    });
});
