import { FILE_CHANNELS } from '../../shared/ipc/channels';
import { FILE_KINDS, MAX_TRANSFER_BYTES } from '../../shared/types/files';
import { access, handleResult } from '../ipc/secureHandle';
import { requireBuffer, requireObject, requireOneOf, requireString } from '../ipc/validate';
import type { ClipboardGuard } from './ClipboardGuard';
import type { FileTransfer } from './FileTransfer';

export function registerFileIpc(files: FileTransfer, clipboard: ClipboardGuard): void {
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

    handleResult(FILE_CHANNELS.copyText, access.authenticated, (_event, text: unknown) => {
        clipboard.copy(requireString(text, 'text', { maxLength: 100_000 }));
    });
}
