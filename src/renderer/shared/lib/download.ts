import { saveAs } from 'file-saver';

const MIME_BY_EXTENSION: Record<string, string> = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf',
    json: 'application/json',
};

/**
 * Offers `content` to the user as a file named `fileName` (the type follows the extension).
 * A string is a data URL (history attachments come that way).
 */
export function downloadFile(content: ArrayBuffer | Blob | string, fileName: string): void {
    if (typeof content === 'string') {
        saveAs(content, fileName);
        return;
    }
    const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
    const blob =
        content instanceof Blob
            ? content
            : new Blob([content], {
                  type: MIME_BY_EXTENSION[extension] ?? 'application/octet-stream',
              });
    saveAs(blob, fileName);
}
