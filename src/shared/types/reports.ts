/** What a stored file of the «Рапорти» section is. */
export type ReportFileKind = 'template' | 'report';

export const REPORT_FILE_KINDS: readonly ReportFileKind[] = ['template', 'report'];

/**
 * A file of the «Рапорти» section: a template (a .docx with placeholders) or a saved report.
 * `filePath` is a file name inside the reports folder.
 */
export type ReportTemplateRecord = {
    id: number;
    name: string;
    filePath: string;
    createdAt: string;
    kind: ReportFileKind;
};

/** A DOCX template shipped with the application. */
export type BundledReportTemplate = {
    id: string;
    name: string;
    timestamp: number;
    content: ArrayBuffer;
};

/** Monthly named list (табель); `key` is the month, e.g. "2026-09". */
export type NamedListRecord = { key: string; data: any };
