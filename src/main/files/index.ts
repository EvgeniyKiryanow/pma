import { clipboard } from 'electron';

import { defineModule, type ModuleContext } from '../app/module';
import { writePrivateClipboardText } from '../core/windows';
import { ClipboardGuard, type TextClipboard } from './ClipboardGuard';
import { FileTransfer } from './FileTransfer';
import { registerFileIpc } from './ipc';

/**
 * Text the app copies is marked so Windows keeps it out of the clipboard history (Win + V)
 * and the cloud clipboard; where that is not possible the ordinary clipboard is used.
 */
const privateClipboard: TextClipboard = {
    readText: () => clipboard.readText(),
    writeText: (text) => {
        if (!writePrivateClipboardText(text)) clipboard.writeText(text);
    },
    clear: () => clipboard.clear(),
};

/** Files and text leaving or entering the app (dialogs, clipboard) without Windows traces. */
export function createFilesModule(context: ModuleContext) {
    const transfer = new FileTransfer(context.createLogger('files'));
    const clipboardGuard = new ClipboardGuard(privateClipboard);

    return defineModule({
        name: 'files',
        transfer,
        clipboard: clipboardGuard,
        registerIpc: () => registerFileIpc(transfer, clipboardGuard),
    });
}
