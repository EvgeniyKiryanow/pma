import { AppError } from '../../shared/ipc/result';
import type { NamedListRecord } from '../../shared/types/reports';
import type { Transactor } from '../db/types';
import type { ChangeJournal } from '../sync/ChangeJournal';
import type { NamedListRepository } from './NamedListRepository';

type NamedListLine = { id: number; attendance?: string[]; [column: string]: unknown };

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
