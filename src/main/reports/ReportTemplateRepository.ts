import type { ReportFileKind, ReportTemplateRecord } from '../../shared/types/reports';
import type { DbProvider } from '../db/types';

export class ReportTemplateRepository {
    constructor(private readonly db: DbProvider) {}

    async list(): Promise<ReportTemplateRecord[]> {
        return (await this.db()).all<ReportTemplateRecord[]>(
            'SELECT * FROM report_templates ORDER BY createdAt DESC',
        );
    }

    async findById(id: number): Promise<ReportTemplateRecord | undefined> {
        return (await this.db()).get<ReportTemplateRecord>(
            'SELECT * FROM report_templates WHERE id = ?',
            id,
        );
    }

    async insert(name: string, filePath: string, kind: ReportFileKind): Promise<number> {
        const result = await (
            await this.db()
        ).run(
            'INSERT INTO report_templates (name, filePath, kind) VALUES (?, ?, ?)',
            name,
            filePath,
            kind,
        );
        return Number(result.lastID);
    }

    async delete(id: number): Promise<void> {
        await (await this.db()).run('DELETE FROM report_templates WHERE id = ?', id);
    }

    async isFileUsed(filePath: string): Promise<boolean> {
        const row = await (
            await this.db()
        ).get('SELECT 1 AS used FROM report_templates WHERE filePath = ?', filePath);
        return Boolean(row);
    }
}
