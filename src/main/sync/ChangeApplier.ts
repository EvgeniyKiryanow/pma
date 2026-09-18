import type { Db } from '../db/types';
import { type ChangeRow, SYNCABLE_TABLES } from './ChangeJournal';

export type ApplyOutcome = 'imported' | 'skipped';

const SYNCABLE = new Set<string>(SYNCABLE_TABLES);

/** Brings a change's payload to the column layout of the table (older logs used other shapes). */
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

/**
 * Applies changes from an imported log to the local database. Records are matched by `uuid`
 * when the change carries one, so a change can never overwrite a different person who happens
 * to have the same local id. One instance per import (it caches table columns).
 */
export class ChangeApplier {
    private readonly columnsCache = new Map<string, Set<string>>();

    constructor(private readonly db: Db) {}

    async apply(change: ChangeRow): Promise<ApplyOutcome> {
        const table = change.table_name;
        if (!SYNCABLE.has(table)) return 'skipped';
        const data = normalizeData(table, change.data);
        if (!data) return 'skipped';

        if (table === 'named_list_tables') {
            return (await this.applyNamedList(change, data)) ? 'imported' : 'skipped';
        }
        return this.applyRecord(table, change, data);
    }

    private async applyRecord(
        table: string,
        change: ChangeRow,
        data: Record<string, unknown>,
    ): Promise<ApplyOutcome> {
        const db = this.db;
        const columns = await this.columns(table);
        const hasUuid =
            columns.has('uuid') && typeof data.uuid === 'string' && data.uuid.length > 0;
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

        const fields = Object.keys(data).filter((key) => key !== 'id' && columns.has(key));
        const values = fields.map((key) => (data[key] === undefined ? null : data[key]));

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

    /** Named lists are keyed by month, not by id. */
    private async applyNamedList(change: ChangeRow, data: Record<string, any>): Promise<boolean> {
        const db = this.db;
        const key = String(data.key ?? change.record_id);
        if (change.operation === 'delete') {
            return (await db.run(`DELETE FROM named_list_tables WHERE key = ?`, key)).changes > 0;
        }
        const table = data.fullData ?? data.data;
        if (!Array.isArray(table)) return false;
        const json = JSON.stringify(table);
        const updated = await db.run(
            `UPDATE named_list_tables SET data = ? WHERE key = ?`,
            json,
            key,
        );
        if (updated.changes > 0) return true;
        return (
            (await db.run(`INSERT INTO named_list_tables (key, data) VALUES (?, ?)`, key, json))
                .changes > 0
        );
    }

    private async columns(table: string): Promise<Set<string>> {
        if (!this.columnsCache.has(table)) {
            const rows: { name: string }[] = await this.db.all(`PRAGMA table_info("${table}")`);
            this.columnsCache.set(table, new Set(rows.map((row) => row.name)));
        }
        return this.columnsCache.get(table)!;
    }
}
