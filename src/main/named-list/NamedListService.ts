import { AppError } from '../../shared/ipc/result';
import type { NamedListRecord } from '../../shared/types/reports';
import type { Transactor } from '../db/types';
import type { ChangeJournal } from '../sync/ChangeJournal';
import type { NamedListRepository } from './NamedListRepository';

type NamedListLine = { id: number; attendance?: string[]; [column: string]: unknown };

export type NamedListCell = { rowId: number; dayIndex: number; value: string };

/** Monthly named list (іменний список / табель), one table per month key ("2026-09"). */
export class NamedListService {
    constructor(
        private readonly transactor: Transactor,
        private readonly tables: NamedListRepository,
        private readonly journal: ChangeJournal,
    ) {}

    async list(): Promise<NamedListRecord[]> {
        return (await this.tables.list()).map((row) => ({
            key: row.key,
            data: JSON.parse(row.data),
        }));
    }

    /** Throws CONFLICT if the month already has a table. */
    async create(key: string, data: unknown[]): Promise<void> {
        await this.transactor.transaction(async () => {
            if (await this.tables.find(key)) throw new AppError('CONFLICT', 'Table already exists');
            await this.tables.insert(key, JSON.stringify(data));
            await this.journal.record('named_list_tables', key, 'insert', { key, data });
        });
    }

    /** Sets the attendance code of one person on one day of the month. */
    async updateCell(key: string, rowId: number, dayIndex: number, value: string): Promise<void> {
        await this.transactor.transaction(async () => {
            const row = await this.tables.find(key);
            if (!row) throw new AppError('NOT_FOUND', 'Table not found');

            const data = JSON.parse(row.data) as NamedListLine[];
            const target = data.find((line) => line.id === rowId);
            if (!target) throw new AppError('NOT_FOUND', 'Row not found');
            if (!Array.isArray(target.attendance) || dayIndex >= target.attendance.length) {
                throw new AppError('VALIDATION', 'Day is outside this table');
            }
            target.attendance[dayIndex] = value;

            await this.tables.update(key, JSON.stringify(data));
            await this.journal.record('named_list_tables', key, 'update', {
                key,
                updatedRowId: rowId,
                updatedDayIndex: dayIndex,
                newValue: value,
                fullData: data,
            });
        });
    }

    /**
     * Sets many cells at once (today's marks for everyone): one write of the table instead of
     * one per person. Cells of rows that are no longer in the table are skipped. Returns how
     * many cells were written.
     */
    async updateCells(key: string, cells: NamedListCell[]): Promise<number> {
        return this.transactor.transaction(async () => {
            const row = await this.tables.find(key);
            if (!row) throw new AppError('NOT_FOUND', 'Table not found');
            const data = JSON.parse(row.data) as NamedListLine[];
            const byId = new Map(data.map((line) => [line.id, line]));
            let written = 0;
            for (const cell of cells) {
                const target = byId.get(cell.rowId);
                if (!target || !Array.isArray(target.attendance)) continue;
                if (cell.dayIndex >= target.attendance.length) continue;
                target.attendance[cell.dayIndex] = cell.value;
                written++;
            }
            if (!written) return 0;
            await this.tables.update(key, JSON.stringify(data));
            await this.journal.record('named_list_tables', key, 'update', { key, fullData: data });
            return written;
        });
    }

    /** Throws NOT_FOUND if the month has no table. */
    async remove(key: string): Promise<void> {
        await this.transactor.transaction(async () => {
            const row = await this.tables.find(key);
            if (!row) throw new AppError('NOT_FOUND');
            await this.tables.delete(key);
            await this.journal.record('named_list_tables', key, 'delete', {
                key,
                data: JSON.parse(row.data),
            });
        });
    }
}
