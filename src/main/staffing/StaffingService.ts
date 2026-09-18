import { AppError } from '../../shared/ipc/result';
import type { ShtatnaPosada } from '../../shared/types/shtatnaPosada';
import type { Transactor } from '../db/types';
import type { ChangeJournal } from '../sync/ChangeJournal';
import type {
    StaffingRepository,
    StaffPositionFields,
    StaffPositionRow,
} from './StaffingRepository';

export type StaffPositionDTO = Omit<StaffPositionRow, 'extra_data'> & {
    extra_data: Record<string, unknown>;
};

export type StaffingImportResult = {
    success: true;
    added: number;
    skipped: number;
    total: number;
};

function parseExtraData(value: string | null): Record<string, unknown> {
    try {
        return value ? JSON.parse(value) : {};
    } catch {
        return {};
    }
}

function toFields(position: ShtatnaPosada): StaffPositionFields {
    return {
        shtat_number: position.shtat_number,
        unit_name: position.unit_name ?? '',
        position_name: position.position_name ?? '',
        category: position.category ?? '',
        shpk_code: position.shpk_code ?? '',
        extra_data: JSON.stringify(position.extra_data ?? {}),
    };
}

/**
 * Staffing table (штатні посади, БЧС). A position is identified by its staff number
 * (`shtat_number`), which is unique.
 */
export class StaffingService {
    constructor(
        private readonly transactor: Transactor,
        private readonly positions: StaffingRepository,
        private readonly journal: ChangeJournal,
    ) {}

    async list(): Promise<StaffPositionDTO[]> {
        return (await this.positions.list()).map((row) => ({
            ...row,
            extra_data: parseExtraData(row.extra_data),
        }));
    }

    /** Adds new positions; numbers that already exist are skipped, never overwritten. */
    async import(positions: ShtatnaPosada[]): Promise<StaffingImportResult> {
        let added = 0;
        let skipped = 0;
        await this.transactor.transaction(async () => {
            for (const position of positions) {
                if (await this.positions.findByNumber(position.shtat_number)) {
                    skipped++;
                    continue;
                }
                const id = await this.positions.insert(toFields(position));
                await this.journal.recordRow('shtatni_posady', id, 'insert');
                added++;
            }
        });
        return { success: true, added, skipped, total: positions.length };
    }

    /** Updates the position with the same staff number. Throws NOT_FOUND if there is none. */
    async update(position: ShtatnaPosada): Promise<void> {
        await this.transactor.transaction(async () => {
            const existing = await this.positions.findByNumber(position.shtat_number);
            if (!existing) throw new AppError('NOT_FOUND', 'Position not found');
            await this.positions.update(existing.id, toFields(position));
            await this.journal.recordRow('shtatni_posady', existing.id, 'update');
        });
    }

    /** Throws NOT_FOUND if there is no position with this number. */
    async remove(shtatNumber: string): Promise<void> {
        await this.transactor.transaction(async () => {
            const row = await this.positions.findByNumber(shtatNumber);
            if (!row) throw new AppError('NOT_FOUND');
            await this.positions.delete(row.id);
            await this.journal.record('shtatni_posady', row.id, 'delete', row);
        });
    }

    async removeAll(): Promise<number> {
        return this.transactor.transaction(async () => {
            const rows = await this.positions.list();
            await this.positions.deleteAll();
            for (const row of rows)
                await this.journal.record('shtatni_posady', row.id, 'delete', row);
            return rows.length;
        });
    }
}
