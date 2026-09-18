import {
    BrowserWindow,
    dialog,
    type OpenDialogOptions,
    type SaveDialogOptions,
    type WebContents,
} from 'electron';

import { sessionManager } from '../auth/SessionManager';
import { createLogger } from './logger';

const logger = createLogger('dialogs');
const openDialogs = new Map<number, number>();

/**
 * Which windows have a file dialog open. A dialog left open does not keep the session alive:
 * the idle lock still happens, and whatever is chosen in it afterwards is discarded.
 */
export const dialogActivity = {
    isOpen: (senderId: number): boolean => (openDialogs.get(senderId) ?? 0) > 0,
};

/**
 * Runs a native dialog for `sender`. If the session of the window ended (or changed) while
 * the dialog was open — the screen locked, someone else signed in — the answer is dropped:
 * a file must not be written or read on behalf of a session that is gone.
 */
async function withDialog<T>(sender: WebContents, canceled: T, show: () => Promise<T>): Promise<T> {
    const session = sessionManager.get(sender);
    openDialogs.set(sender.id, (openDialogs.get(sender.id) ?? 0) + 1);
    try {
        const answer = await show();
        if (sessionManager.get(sender) !== session) {
            logger.warn(
                'A file dialog was answered after the session ended; the answer is ignored',
            );
            return canceled;
        }
        return answer;
    } finally {
        const left = (openDialogs.get(sender.id) ?? 1) - 1;
        if (left > 0) openDialogs.set(sender.id, left);
        else openDialogs.delete(sender.id);
    }
}

/**
 * Native file dialogs attached to the window that asked for them (modal to that window).
 * They return `null` / `[]` when the user cancels, so callers only deal with a path or nothing.
 *
 * Every dialog is opened with `dontAddToRecent`: without it Windows records the chosen file
 * in "Recent items" and in the registry (ComDlg32\OpenSavePidlMRU), which is exactly the kind
 * of trace this app must not leave. Checked on Windows 11: with the flag nothing is recorded.
 */
export async function chooseSavePath(
    sender: WebContents,
    options: Omit<SaveDialogOptions, 'properties'>,
): Promise<string | null> {
    const window = BrowserWindow.fromWebContents(sender);
    const settings: SaveDialogOptions = {
        ...options,
        properties: ['dontAddToRecent', 'showOverwriteConfirmation', 'createDirectory'],
    };
    return withDialog(sender, null, async () => {
        const { canceled, filePath } = window
            ? await dialog.showSaveDialog(window, settings)
            : await dialog.showSaveDialog(settings);
        return canceled || !filePath ? null : filePath;
    });
}

export async function chooseOpenFile(
    sender: WebContents,
    options: Omit<OpenDialogOptions, 'properties'>,
): Promise<string | null> {
    return (await chooseOpenFiles(sender, options, false))[0] ?? null;
}

export async function chooseOpenFiles(
    sender: WebContents,
    options: Omit<OpenDialogOptions, 'properties'>,
    multiple: boolean,
): Promise<string[]> {
    const window = BrowserWindow.fromWebContents(sender);
    const settings: OpenDialogOptions = {
        ...options,
        properties: multiple
            ? ['openFile', 'multiSelections', 'dontAddToRecent']
            : ['openFile', 'dontAddToRecent'],
    };
    return withDialog(sender, [] as string[], async () => {
        const { canceled, filePaths } = window
            ? await dialog.showOpenDialog(window, settings)
            : await dialog.showOpenDialog(settings);
        return canceled ? [] : filePaths;
    });
}
