import { AppError } from '../../../shared/ipc/result';
import type { Db } from '../types';
import type { Migration } from './types';

export type MigrationReport = {
    from: number;
    to: number;
    applied: { version: number; name: string }[];
};

export type MigrationHooks = {
    /** Called once before the first pending migration (e.g. to take a safety snapshot). */
    beforeMigrate?: (from: number, to: number) => Promise<void>;
    log?: (message: string) => void;
};

export class MigrationRunner {
    private readonly migrations: Migration[];

    constructor(migrations: Migration[]) {
        this.migrations = [...migrations].sort((a, b) => a.version - b.version);
        this.migrations.forEach((m, index) => {
            if (m.version !== index + 1) {
                throw new Error(`Migrations must be numbered 1..N without gaps (got ${m.version})`);
            }
        });
    }

    get latestVersion(): number {
        return this.migrations.length;
    }

    async currentVersion(db: Db): Promise<number> {
        const row = await db.get<{ user_version: number }>('PRAGMA user_version');
        return row?.user_version ?? 0;
    }

    async run(db: Db, hooks: MigrationHooks = {}): Promise<MigrationReport> {
        const from = await this.currentVersion(db);

        if (from > this.latestVersion) {
            throw new AppError(
                'SCHEMA_TOO_NEW',
                `Database schema v${from} is newer than this application supports (v${this.latestVersion})`,
                { databaseVersion: from, supportedVersion: this.latestVersion },
            );
        }

        const pending = this.migrations.filter((m) => m.version > from);
        const report: MigrationReport = { from, to: from, applied: [] };
        if (!pending.length) return report;

        await hooks.beforeMigrate?.(from, this.latestVersion);

        await db.exec('PRAGMA foreign_keys = OFF');
        try {
            for (const migration of pending) {
                hooks.log?.(`Applying migration ${migration.version} (${migration.name})`);
                await db.exec('BEGIN IMMEDIATE');
                try {
                    await migration.up(db);
                    for (const table of migration.verifyForeignKeys ?? []) {
                        const violations = await db.all(`PRAGMA foreign_key_check("${table}")`);
                        if (violations.length) {
                            throw new Error(
                                `Migration ${migration.version}: ${violations.length} foreign key violation(s) in ${table}`,
                            );
                        }
                    }
                    await db.exec(`PRAGMA user_version = ${migration.version}`);
                    await db.exec('COMMIT');
                } catch (err) {
                    await db.exec('ROLLBACK').catch(() => undefined);
                    throw err;
                }
                report.to = migration.version;
                report.applied.push({ version: migration.version, name: migration.name });
            }
        } finally {
            await db.exec('PRAGMA foreign_keys = ON');
        }
        return report;
    }
}
