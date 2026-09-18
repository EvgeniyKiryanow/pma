import { AWARD_KINDS, type AwardKind, CUSTOM_PREFIX } from '../../shared/awards/catalog';
import { AppError } from '../../shared/ipc/result';
import type { AwardType, AwardTypeInput } from '../../shared/types/awards';
import type { Transactor } from '../db/types';
import type { ChangeJournal } from '../sync/ChangeJournal';
import type { AwardTypeRepository, AwardTypeRow, AwardTypeValues } from './AwardTypeRepository';

const DEGREE = /^(I|II|III|IV|V)$/;
const KINDS = new Set<string>(AWARD_KINDS);

function toAwardType(row: AwardTypeRow): AwardType {
    let degrees: string[] = [];
    try {
        const parsed = JSON.parse(row.degrees || '[]');
        if (Array.isArray(parsed)) degrees = parsed.filter((d) => typeof d === 'string');
    } catch {
        // A damaged value from an old exchange file: no degrees.
    }
    return {
        uuid: row.uuid,
        name: row.name,
        kind: KINDS.has(row.kind) ? (row.kind as AwardKind) : 'other',
        awardedBy: row.awarded_by ?? '',
        degrees,
        established: row.established ?? '',
        notes: row.notes ?? '',
        retired: Boolean(row.retired),
    };
}

function text(value: unknown, field: string, maxLength: number): string {
    if (value !== undefined && value !== null && typeof value !== 'string') {
        throw new AppError('VALIDATION', undefined, { field });
    }
    const trimmed = String(value ?? '').trim();
    if (trimmed.length > maxLength)
        throw new AppError('VALIDATION', undefined, { field, maxLength });
    return trimmed;
}

/** Checks and trims what the screen sends; throws VALIDATION naming the field. */
export function cleanAwardType(input: AwardTypeInput): AwardTypeValues {
    const name = text(input.name, 'name', 300);
    if (!name) throw new AppError('VALIDATION', undefined, { field: 'name' });
    if (!KINDS.has(input.kind)) throw new AppError('VALIDATION', undefined, { field: 'kind' });
    const degrees = Array.isArray(input.degrees) ? input.degrees : [];
    if (degrees.some((d) => typeof d !== 'string' || !DEGREE.test(d))) {
        throw new AppError('VALIDATION', undefined, { field: 'degrees' });
    }
    // Highest first, whatever order they were ticked in.
    const ordered = ['I', 'II', 'III', 'IV', 'V'].filter((d) => degrees.includes(d));
    return {
        name,
        kind: input.kind,
        awarded_by: text(input.awardedBy, 'awardedBy', 300),
        degrees: JSON.stringify(ordered),
        established: text(input.established, 'established', 500),
        notes: text(input.notes, 'notes', 2000),
        retired: input.retired ? 1 : 0,
    };
}

/**
 * The unit's own register of awards (brigade, battalion, local, public). Cards keep
 * `custom:<uuid>`; an award that is in a card cannot be deleted, only marked as no longer
 * awarded.
 */
export class AwardTypeService {
    constructor(
        private readonly transactor: Transactor,
        private readonly types: AwardTypeRepository,
        private readonly journal: ChangeJournal,
    ) {}

    async list(): Promise<AwardType[]> {
        return (await this.types.list()).map(toAwardType);
    }

    /** Adds (no uuid) or changes an award of the register. Throws NOT_FOUND / VALIDATION. */
    async save(input: AwardTypeInput): Promise<AwardType> {
        const values = cleanAwardType(input);
        return this.transactor.transaction(async () => {
            let id: number;
            if (input.uuid) {
                const current = await this.types.findByUuid(input.uuid);
                if (!current) throw new AppError('NOT_FOUND');
                id = current.id;
                await this.types.update(id, values);
                await this.journal.recordRow('award_types', id, 'update');
            } else {
                id = await this.types.insert(values);
                await this.journal.recordRow('award_types', id, 'insert');
            }
            const row = await this.types.findById(id);
            if (!row) throw new AppError('INTERNAL');
            return toAwardType(row);
        });
    }

    /** Throws CONFLICT (details.holders) while someone's card holds the award. */
    async remove(uuid: string): Promise<void> {
        await this.transactor.transaction(async () => {
            const row = await this.types.findByUuid(uuid);
            if (!row) throw new AppError('NOT_FOUND');
            const holders = await this.types.countHolders(`${CUSTOM_PREFIX}${uuid}`);
            if (holders > 0) throw new AppError('CONFLICT', 'Award is in use', { holders });
            await this.types.delete(row.id);
            await this.journal.record('award_types', row.id, 'delete', row);
        });
    }
}
