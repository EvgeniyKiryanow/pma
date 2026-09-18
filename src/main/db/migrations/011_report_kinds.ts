import { addMissingColumns } from './helpers';
import type { Migration } from './types';

/**
 * Files of the «Рапорти» section are either templates (a .docx with placeholders, used to
 * create reports) or saved reports (any file kept for the unit). Before this version only
 * saved reports were stored — uploaded templates were never written — so existing rows are
 * reports.
 */
export const reportKinds: Migration = {
    version: 11,
    name: 'report-kinds',
    async up(db) {
        await addMissingColumns(db, 'report_templates', {
            kind: "TEXT NOT NULL DEFAULT 'report'",
        });
    },
};
