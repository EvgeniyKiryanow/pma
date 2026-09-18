import type { Migration } from './types';

/**
 * v1.6 stored absolute paths of uploaded report templates (C:\Users\<name>\AppData\...),
 * which break as soon as the data is restored on another computer or Windows account.
 * From now on only the file name is stored; the file always lives in AppPaths.reports.
 */
export const portableReportPaths: Migration = {
    version: 4,
    name: 'portable-report-paths',
    async up(db) {
        const rows: { id: number; filePath: string }[] = await db.all(
            `SELECT id, filePath FROM report_templates`,
        );
        for (const row of rows) {
            const fileName = String(row.filePath ?? '')
                .split(/[\\/]/)
                .pop();
            if (fileName && fileName !== row.filePath) {
                await db.run(
                    `UPDATE report_templates SET filePath = ? WHERE id = ?`,
                    fileName,
                    row.id,
                );
            }
        }
    },
};
