import { FILE_CHANNELS } from '../../shared/ipc/channels';
import { AppError } from '../../shared/ipc/result';
import {
    FILE_KINDS,
    MAX_PRINT_BYTES,
    MAX_TRANSFER_BYTES,
    type PrintableDocument,
} from '../../shared/types/files';
import { access, handleResult } from '../ipc/secureHandle';
import { requireBuffer, requireObject, requireOneOf, requireString } from '../ipc/validate';
import type { ClipboardGuard } from './ClipboardGuard';
import type { DocumentPrinter } from './DocumentPrinter';
import type { FileTransfer } from './FileTransfer';

function requirePrintable(input: unknown): PrintableDocument {
    const doc = requireObject(input, 'document');
    const title = requireString(doc.title, 'title', { maxLength: 200 });
    const html = requireString(doc.html, 'html', { maxLength: MAX_PRINT_BYTES });
    const css = requireString(doc.css, 'css', { maxLength: MAX_PRINT_BYTES });
    const scale = Number(doc.scale);
    if (!Number.isFinite(scale) || scale <= 0 || scale > 1) {
        throw new AppError('VALIDATION', undefined, { field: 'scale' });
    }
    return { title, html, css, landscape: doc.landscape !== false, scale };
}

export function registerFileIpc(
    files: FileTransfer,
    clipboard: ClipboardGuard,
    printer: DocumentPrinter,
): void {
    // Any signed-in user: picking a file only reads what the person chose, saving writes what
    // they already see on the screen. What happens with the content is checked by the
    // channel that receives it (import, attachment, template...).
    handleResult(FILE_CHANNELS.pick, access.authenticated, (event, input: unknown) => {
        const request = requireObject(input, 'request');
        return files.pick(
            event.sender,
            requireOneOf(request.kind, 'kind', FILE_KINDS),
            request.multiple === true,
        );
    });

    handleResult(
        FILE_CHANNELS.save,
        access.authenticated,
        (event, input: unknown) => {
            const request = requireObject(input, 'request');
            return files.save(
                event.sender,
                requireString(request.fileName, 'fileName', { maxLength: 200 }),
                requireBuffer(request.data, 'data', { maxBytes: MAX_TRANSFER_BYTES }),
            );
        },
        { audit: 'files.export' },
    );

    // Reports on paper or as PDF, rendered by Chromium (no LibreOffice needed). The page is
    // what the person already sees in the window.
    handleResult(
        FILE_CHANNELS.print,
        access.authenticated,
        async (_event, input: unknown) => ({
            printed: await printer.print(requirePrintable(input)),
        }),
        { audit: 'files.print' },
    );

    handleResult(
        FILE_CHANNELS.savePdf,
        access.authenticated,
        async (event, input: unknown) => {
            const doc = requirePrintable(input);
            return files.save(event.sender, `${doc.title}.pdf`, await printer.pdf(doc));
        },
        { audit: 'files.export' },
    );

    handleResult(FILE_CHANNELS.copyText, access.authenticated, (_event, text: unknown) => {
        clipboard.copy(requireString(text, 'text', { maxLength: 100_000 }));
    });
}
