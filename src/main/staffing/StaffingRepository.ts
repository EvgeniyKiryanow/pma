import type { DbProvider } from '../db/types';

export type StaffPositionRow = {
    id: number;
    uuid: string;
    shtat_number: string;
    unit_name: string;
    position_name: string;
    category: string;
    shpk_code: string;
    /** JSON of the original Excel row. */
    extra_data: string | null;
};

export type StaffPositionFields = Pick<
    StaffPositionRow,
    'shtat_number' | 'unit_name' | 'position_name' | 'category' | 'shpk_code' | 'extra_data'
>;

export class StaffingRepository {
    constructor(private readonly db: DbProvider) {}

    async list(): Promise<StaffPositionRow[]> {
        return (await this.db()).all<StaffPositionRow[]>(
            'SELECT * FROM shtatni_posady ORDER BY shtat_number ASC',
        );
    }

    async findByNumber(shtatNumber: string): Promise<StaffPositionRow | undefined> {
        return (await this.db()).get<StaffPositionRow>(
            `SELECT * FROM shtatni_posady WHERE shtat_number = ?`,
            shtatNumber,
        );
    }

    async insert(position: StaffPositionFields): Promise<number> {
        const result = await (
            await this.db()
        ).run(
            `INSERT INTO shtatni_posady (shtat_number, unit_name, position_name, category, shpk_code, extra_data)
             VALUES (?, ?, ?, ?, ?, ?)`,
            position.shtat_number,
            position.unit_name,
            position.position_name,
            position.category,
            position.shpk_code,
            position.extra_data,
        );
        return Number(result.lastID);
    }

    async update(id: number, position: StaffPositionFields): Promise<void> {
        await (
            await this.db()
        ).run(
            `UPDATE shtatni_posady
             SET shtat_number = ?, unit_name = ?, position_name = ?, category = ?, shpk_code = ?, extra_data = ?
             WHERE id = ?`,
            position.shtat_number,
            position.unit_name,
            position.position_name,
            position.category,
            position.shpk_code,
            position.extra_data,
            id,
        );
    }

    async delete(id: number): Promise<void> {
        await (await this.db()).run(`DELETE FROM shtatni_posady WHERE id = ?`, id);
    }

    async deleteAll(): Promise<void> {
        await (await this.db()).run('DELETE FROM shtatni_posady');
    }
}
