/** Error keys of the change-log exchange, translated by the renderer. */
export type ChangeLogError = 'short-password' | 'invalid-password' | 'unreadable';

export type ChangeLogExportResult = {
    exported: number;
    /** Changes left for the next file: the files did not fit into one. */
    remaining?: number;
    canceled?: boolean;
    error?: ChangeLogError;
};

export type ChangeLogImportResult = {
    imported: number;
    skipped?: number;
    failed?: number;
    canceled?: boolean;
    error?: ChangeLogError;
};
