import type { FileKind } from '../../../shared/types/files';
import { filesApi } from '../api/files';

/**
 * Lets the user choose files through a dialog in the main process and returns them as
 * browser `File` objects, so existing readers (FileReader, xlsx, docx) keep working.
 *
 * Used instead of `<input type="file">`: the browser's file chooser records every chosen
 * file in the Windows registry, the app's dialog does not. Empty array = dialog closed.
 */
export async function pickFiles(kind: FileKind, { multiple = false } = {}): Promise<File[]> {
    const picked = await filesApi.pick({ kind, multiple });
    return picked.map((file) => new File([file.data], file.name, { type: file.type }));
}

/** One file, or null when the dialog was closed. */
export async function pickFile(kind: FileKind): Promise<File | null> {
    return (await pickFiles(kind))[0] ?? null;
}

/** Reads a file as a data URL (attachments are sent to the main process that way). */
export function readAsDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error('File could not be read'));
        reader.readAsDataURL(file);
    });
}

/** "scan.pdf" → "scan (2).pdf" when a file with that name is already in the list. */
export function uniqueFileName(name: string, existing: Iterable<string>): string {
    const taken = new Set([...existing].map((n) => n.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    for (let i = 2; ; i++) {
        const candidate = `${base} (${i})${ext}`;
        if (!taken.has(candidate.toLowerCase())) return candidate;
    }
}
