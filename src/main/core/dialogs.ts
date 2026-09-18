import {
    BrowserWindow,
    dialog,
    type OpenDialogOptions,
    type SaveDialogOptions,
    type WebContents,
} from 'electron';

/**
 * Native file dialogs attached to the window that asked for them (modal to that window).
 * Both return `null` when the user cancels, so callers only deal with a path or nothing.
 */
export async function chooseSavePath(
    sender: WebContents,
    options: SaveDialogOptions,
): Promise<string | null> {
    const window = BrowserWindow.fromWebContents(sender);
    const { canceled, filePath } = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options);
    return canceled || !filePath ? null : filePath;
}

export async function chooseOpenFile(
    sender: WebContents,
    options: Omit<OpenDialogOptions, 'properties'>,
): Promise<string | null> {
    const window = BrowserWindow.fromWebContents(sender);
    const settings: OpenDialogOptions = { ...options, properties: ['openFile'] };
    const { canceled, filePaths } = window
        ? await dialog.showOpenDialog(window, settings)
        : await dialog.showOpenDialog(settings);
    return canceled || !filePaths.length ? null : filePaths[0];
}
