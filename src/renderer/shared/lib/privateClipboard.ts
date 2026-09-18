import { filesApi } from '../api/files';

type TextField = HTMLInputElement | HTMLTextAreaElement;

function focusedTextField(): TextField | null {
    const active = document.activeElement;
    if (active instanceof HTMLTextAreaElement) return active;
    if (active instanceof HTMLInputElement && active.type !== 'password') return active;
    return null;
}

/** Signed in: through the main process (private). On the sign-in screen: the usual way. */
async function copy(text: string): Promise<void> {
    try {
        await filesApi.copyText(text);
    } catch {
        await navigator.clipboard?.writeText(text).catch(() => undefined);
    }
}

function onCopyOrCut(event: ClipboardEvent): void {
    const cut = event.type === 'cut';
    const field = focusedTextField();
    if (field) {
        const start = field.selectionStart ?? 0;
        const end = field.selectionEnd ?? 0;
        if (start === end) return;
        event.preventDefault();
        void copy(field.value.slice(start, end));
        if (cut && !field.readOnly && !field.disabled) {
            field.setRangeText('', start, end, 'end');
            // React sees the change as typing.
            field.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return;
    }
    const text = window.getSelection()?.toString() ?? '';
    if (!text) return;
    event.preventDefault();
    void copy(text);
}

/**
 * Ctrl+C / Ctrl+X in the window: the text is put on the clipboard by the main process, marked
 * so Windows keeps it out of the clipboard history (Win + V) and the cloud clipboard, and it
 * is cleared again when the session ends.
 */
export function installPrivateClipboard(): void {
    document.addEventListener('copy', onCopyOrCut);
    document.addEventListener('cut', onCopyOrCut);
}
