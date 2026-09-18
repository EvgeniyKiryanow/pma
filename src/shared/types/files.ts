/** What a file dialog offers. Each kind maps to a fixed set of extensions in the main process. */
export type FileKind = 'excel' | 'docx' | 'documents' | 'images' | 'comment-files' | 'any';

export const FILE_KINDS: readonly FileKind[] = [
    'excel',
    'docx',
    'documents',
    'images',
    'comment-files',
    'any',
];

export type PickFilesRequest = {
    kind: FileKind;
    multiple?: boolean;
};

/** A file chosen by the user, read by the main process. */
export type PickedFile = {
    name: string;
    /** MIME type derived from the extension. */
    type: string;
    size: number;
    data: Uint8Array;
};

export type SaveFileRequest = {
    /** Suggested file name; the extension decides the dialog filter. */
    fileName: string;
    data: Uint8Array | ArrayBuffer;
};

/** `saved: false` means the user closed the dialog. */
export type SaveFileResult = { saved: boolean; fileName: string | null };

/** A report as the window shows it, to print or save as PDF (see DocumentPrinter). */
export type PrintableDocument = {
    /** Heading on the page and the suggested file name. */
    title: string;
    /** The report element (outerHTML). */
    html: string;
    /** The app's style rules, so the page looks as on the screen. */
    css: string;
    landscape: boolean;
    /** Shrinks a wide report to the page width (0.1–1). */
    scale: number;
};

export type PrintResult = { printed: boolean };

/** Largest report page accepted for printing (html + css). */
export const MAX_PRINT_BYTES = 12 * 1024 * 1024;

/** Largest single file accepted from a dialog or saved through one. */
export const MAX_TRANSFER_BYTES = 150 * 1024 * 1024;
