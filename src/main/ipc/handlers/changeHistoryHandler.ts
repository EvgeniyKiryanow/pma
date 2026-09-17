import { createDecipheriv, randomUUID } from 'crypto';
import { BrowserWindow, dialog } from 'electron';
import fsp from 'fs/promises';
import path from 'path';

import { decryptPackage, detectFormat, encryptFile } from '../../backup/crypto';
import { remove } from '../../core/fsUtils';
import { createLogger } from '../../core/logger';
import { AppPaths } from '../../core/paths';
import { database } from '../../db/connection';
import type { Db } from '../../db/types';
import { access, handle } from '../secureHandle';

const logger = createLogger('change-log');
const MIN_PASSWORD_LENGTH = 8;

/** Tables that may be changed by an imported change log. Anything else is ignored. */
const SYNCABLE_TABLES = new Set([
    'users',
    'user_history',
    'comments',
    'todos',
    'report_templates',
    'shtatni_posady',
    'named_list_tables',
    'user_directives',
]);

type ChangeRow = {
    id?: number;
    table_name: string;
    record_id: number | string;
    operation: 'insert' | 'update' | 'delete';
    data: unknown;
    timestamp?: string;
};

type ImportStats = { imported: number; skipped: number; failed: number };

async function withTempDir<T>(work: (dir: string) => Promise<T>): Promise<T> {
    const dir = path.join(AppPaths.userData, '.staging', `changelog-${randomUUID()}`);
    await fsp.mkdir(dir, { recursive: true });
    try {
        return await work(dir);
    } finally {
        await remove(dir);
    }
}

async function readChangeFile(filePath: string, password: string): Promise<ChangeRow[]> {
    return withTempDir(async (dir) => {
        const plain = path.join(dir, 'changes.json');
        if ((await detectFormat(filePath)) === 'pmb2') {
            await decryptPackage(filePath, plain, password);
            return JSON.parse(await fsp.readFile(plain, 'utf8'));
        }
        // v1.x change logs used the legacy cipher; the payload is JSON, not SQLite.
        const buffer = await fsp.readFile(filePath);
        const key = Buffer.from(password.padEnd(32, ' '), 'utf8');
        if (key.length !== 32) throw new Error('invalid-password');
        try {
            const decipher = createDecipheriv('aes-256-gcm', key, buffer.subarray(0, 12));
            decipher.setAuthTag(buffer.subarray(12, 28));
            const plainBuffer = Buffer.concat([
                decipher.update(buffer.subarray(28)),
                decipher.final(),
            ]);
            return JSON.parse(plainBuffer.toString('utf8'));
        } catch {
            throw new Error('invalid-password');
        }
    });
}

async function tableColumns(
    db: Db,
    table: string,
    cache: Map<string, Set<string>>,
): Promise<Set<string>> {
    if (!cache.has(table)) {
        const rows: { name: string }[] = await db.all(`PRAGMA table_info("${table}")`);
        cache.set(table, new Set(rows.map((r) => r.name)));
    }
    return cache.get(table)!;
}

function normalizeData(table: string, raw: unknown): Record<string, unknown> | null {
    let data = raw;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return null;
        }
    }
    if (!data || typeof data !== 'object') return null;
    const record = { ...(data as Record<string, unknown>) };

    if (table === 'user_directives') {
        const period = record.period as { from?: string; to?: string } | undefined;
        if (period) {
            record.period_from = period.from || '';
            record.period_to = period.to || '';
            delete record.period;
        }
        if (record.file && typeof record.file === 'object')
            record.file = JSON.stringify(record.file);
    }
    if (table === 'shtatni_posady' && record.extra_data && typeof record.extra_data === 'object') {
        record.extra_data = JSON.stringify(record.extra_data);
    }
    return record;
}

async function applyNamedList(
    db: Db,
    change: ChangeRow,
    data: Record<string, any>,
): Promise<boolean> {
    const key = String(data.key ?? change.record_id);
    if (change.operation === 'delete') {
        return (await db.run(`DELETE FROM named_list_tables WHERE key = ?`, key)).changes > 0;
    }
    const table = data.fullData ?? data.data;
    if (!Array.isArray(table)) return false;
    const json = JSON.stringify(table);
    const updated = await db.run(`UPDATE named_list_tables SET data = ? WHERE key = ?`, json, key);
    if (updated.changes > 0) return true;
    return (
        (await db.run(`INSERT INTO named_list_tables (key, data) VALUES (?, ?)`, key, json))
            .changes > 0
    );
}

/**
 * Applies one change. Records are matched by `uuid` when the change carries one, so a change
 * can never overwrite a different person who happens to have the same local id.
 * Returns 'imported' | 'skipped'.
 */
async function applyChange(db: Db, change: ChangeRow, columnsCache: Map<string, Set<string>>) {
    const table = change.table_name;
    if (!SYNCABLE_TABLES.has(table)) return 'skipped';
    const data = normalizeData(table, change.data);
    if (!data) return 'skipped';

    if (table === 'named_list_tables')
        return (await applyNamedList(db, change, data)) ? 'imported' : 'skipped';

    const columns = await tableColumns(db, table, columnsCache);
    const hasUuid = columns.has('uuid') && typeof data.uuid === 'string' && data.uuid.length > 0;
    const recordId = Number(data.id ?? change.record_id);

    const byUuid = hasUuid
        ? await db.get(`SELECT id FROM "${table}" WHERE uuid = ?`, data.uuid)
        : undefined;
    const byId = Number.isFinite(recordId)
        ? await db.get(`SELECT id FROM "${table}" WHERE id = ?`, recordId)
        : undefined;
    // With a uuid only the uuid decides; the local id may belong to a different record.
    const target = hasUuid ? byUuid : byId;

    if (change.operation === 'delete') {
        if (!target) return 'skipped';
        await db.run(`DELETE FROM "${table}" WHERE id = ?`, target.id);
        return 'imported';
    }

    const fields = Object.keys(data).filter((k) => k !== 'id' && columns.has(k));
    const values = fields.map((k) => (data[k] === undefined ? null : data[k]));

    if (target) {
        if (!fields.length) return 'skipped';
        await db.run(
            `UPDATE "${table}" SET ${fields.map((f) => `"${f}" = ?`).join(', ')} WHERE id = ?`,
            ...values,
            target.id,
        );
        return 'imported';
    }

    if (!hasUuid && byId) return 'skipped'; // legacy change without uuid and the id is taken
    const keepId = Number.isFinite(recordId) && !byId;
    const insertFields = keepId ? ['id', ...fields] : fields;
    const insertValues = keepId ? [recordId, ...values] : values;
    if (!insertFields.length) return 'skipped';
    await db.run(
        `INSERT INTO "${table}" (${insertFields.map((f) => `"${f}"`).join(', ')}) VALUES (${insertFields.map(() => '?').join(', ')})`,
        ...insertValues,
    );
    return 'imported';
}

export function registerChangeHistoryHandler() {
    handle(
        'change-history:export',
        access.any('sync.export'),
        async (event, password: string) => {
            if (!password || password.length < MIN_PASSWORD_LENGTH)
                return { exported: 0, error: 'short-password' };

            const db = await database.get();
            const logs: ChangeRow[] = await db.all(
                `SELECT * FROM change_history WHERE source_id IS NULL OR source_id = 'local' ORDER BY id ASC`,
            );
            if (!logs.length) return { exported: 0 };

            const window = BrowserWindow.fromWebContents(event.sender);
            const options = {
                title: 'Експорт журналу змін',
                defaultPath: 'change_log.pmc',
                filters: [{ name: 'Журнал змін', extensions: ['pmc'] }],
            };
            const { canceled, filePath } = window
                ? await dialog.showSaveDialog(window, options)
                : await dialog.showSaveDialog(options);
            if (canceled || !filePath) return { exported: 0, canceled: true };

            await withTempDir(async (dir) => {
                const plain = path.join(dir, 'changes.json');
                await fsp.writeFile(plain, JSON.stringify(logs), 'utf8');
                await encryptFile(plain, filePath, password);
            });

            // Only entries that were actually written are removed from the local journal.
            const maxId = logs[logs.length - 1].id;
            await db.run(
                `DELETE FROM change_history WHERE id <= ? AND (source_id IS NULL OR source_id = 'local')`,
                maxId,
            );
            logger.info(`Exported ${logs.length} change(s)`);
            return { exported: logs.length };
        },
        { audit: 'sync.export' },
    );

    handle(
        'change-history:import',
        access.any('sync.import'),
        async (event, password: string) => {
            const window = BrowserWindow.fromWebContents(event.sender);
            const options = {
                title: 'Імпорт журналу змін',
                properties: ['openFile'] as 'openFile'[],
                filters: [{ name: 'Журнал змін', extensions: ['pmc'] }],
            };
            const { canceled, filePaths } = window
                ? await dialog.showOpenDialog(window, options)
                : await dialog.showOpenDialog(options);
            if (canceled || !filePaths.length) return { imported: 0, canceled: true };

            let changes: ChangeRow[];
            try {
                changes = await readChangeFile(filePaths[0], String(password ?? ''));
            } catch (err: any) {
                const invalid =
                    err?.message === 'invalid-password' || err?.code === 'INVALID_PASSWORD';
                return { imported: 0, error: invalid ? 'invalid-password' : 'unreadable' };
            }
            if (!Array.isArray(changes)) return { imported: 0, error: 'unreadable' };

            const stats: ImportStats = { imported: 0, skipped: 0, failed: 0 };
            const columnsCache = new Map<string, Set<string>>();

            await database.transaction(async (db) => {
                for (const [index, change] of changes.entries()) {
                    await db.exec(`SAVEPOINT change_${index}`);
                    try {
                        stats[await applyChange(db, change, columnsCache)] += 1;
                        await db.exec(`RELEASE change_${index}`);
                    } catch (err) {
                        await db.exec(`ROLLBACK TO change_${index}`);
                        await db.exec(`RELEASE change_${index}`);
                        stats.failed += 1;
                        logger.warn(
                            `Change ${change?.operation} on ${change?.table_name} failed`,
                            err,
                        );
                    }
                }
            });

            logger.info(`Change log import: ${JSON.stringify(stats)}`);
            return stats;
        },
        { audit: 'sync.import' },
    );
}
