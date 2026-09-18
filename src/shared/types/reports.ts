/** A DOCX template uploaded by a user; `filePath` is a file name inside the reports folder. */
export type ReportTemplateRecord = {
    id: number;
    name: string;
    filePath: string;
    createdAt: string;
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
