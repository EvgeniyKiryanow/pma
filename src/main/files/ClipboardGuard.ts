/** The part of Electron's clipboard this class needs (lets tests pass a fake). */
export type TextClipboard = {
    readText(): string;
    writeText(text: string): void;
    clear(): void;
};

/**
 * Copies text for the renderer and takes it back when the session ends: a passport number
 * copied into a form should not stay in the clipboard after the screen locks or the app
 * closes. Only text the app itself put there is cleared — whatever the person copied from
 * another program afterwards is left alone.
 */
export class ClipboardGuard {
    private lastCopied: string | null = null;

    constructor(private readonly clipboard: TextClipboard) {}

    copy(text: string): void {
        this.clipboard.writeText(text);
        this.lastCopied = text;
    }

    /** Clears the clipboard if it still holds what the app copied. */
    clearIfOurs(): void {
        if (this.lastCopied === null) return;
        if (this.clipboard.readText() === this.lastCopied) this.clipboard.clear();
        this.lastCopied = null;
    }
}
