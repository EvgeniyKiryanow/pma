import type { DbProvider } from '../db/types';

export type AwardTypeRow = {
    id: number;
    uuid: string;
    name: string;
    kind: string;
    awarded_by: string;
    degrees: string;
    established: string;
    notes: string;
    retired: number;
};

export type AwardTypeValues = Omit<AwardTypeRow, 'id' | 'uuid'>;

/** SQL of the own awards register (`award_types`). */
export class AwardTypeRepository {
    constructor(private readonly db: DbProvider) {}

    async list(): Promise<AwardTypeRow[]> {
        return (await this.db()).all<AwardTypeRow[]>(
            'SELECT * FROM award_types ORDER BY retired ASC, name COLLATE NOCASE ASC',
        );
    }

    async findById(id: number): Promise<AwardTypeRow | undefined> {
        return (await this.db()).get<AwardTypeRow>('SELECT * FROM award_types WHERE id = ?', id);
    }

    async findByUuid(uuid: string): Promise<AwardTypeRow | undefined> {
        return (await this.db()).get<AwardTypeRow>(
            'SELECT * FROM award_types WHERE uuid = ?',
            uuid,
        );
    }

    async insert(values: AwardTypeValues): Promise<number> {
        const result = await (
            await this.db()
        ).run(
            `INSERT INTO award_types (name, kind, awarded_by, degrees, established, notes, retired)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            values.name,
            values.kind,
            values.awarded_by,
            values.degrees,
            values.established,
            values.notes,
            values.retired,
        );
        return Number(result.lastID);
    }

    async update(id: number, values: AwardTypeValues): Promise<void> {
        await (
            await this.db()
        ).run(
            `UPDATE award_types SET name = ?, kind = ?, awarded_by = ?, degrees = ?,
                 established = ?, notes = ?, retired = ?
             WHERE id = ?`,
            values.name,
            values.kind,
            values.awarded_by,
            values.degrees,
            values.established,
            values.notes,
            values.retired,
            id,
        );
    }

    async delete(id: number): Promise<void> {
        await (await this.db()).run('DELETE FROM award_types WHERE id = ?', id);
    }

    /** People whose cards hold the award (its id inside the JSON list of awards). */
    async countHolders(awardId: string): Promise<number> {
        const row = await (
            await this.db()
        ).get<{ n: number }>(
            'SELECT COUNT(*) AS n FROM users WHERE awardRecords LIKE ?',
            `%"${awardId}"%`,
        );
        return row?.n ?? 0;
    }
}
