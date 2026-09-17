import fs from 'fs/promises';

import { AppPaths, resolveInside, safeFileName } from '../core/paths';

/** Directory of one history entry's attachments, guaranteed to stay inside history_files. */
export function historyEntryDir(userId: number | string, entryId: number | string): string {
    return resolveInside(
        AppPaths.historyFiles,
        safeFileName(String(userId)),
        safeFileName(String(entryId)),
    );
}

export function historyFilePath(
    userId: number | string,
    entryId: number | string,
    fileName: string,
): string {
    return resolveInside(historyEntryDir(userId, entryId), safeFileName(fileName));
}

export async function saveHistoryFiles(
    userId: number,
    entryId: number,
    files: { name: string; type: string; dataUrl?: string }[],
): Promise<void> {
    await fs.mkdir(historyEntryDir(userId, entryId), { recursive: true });

    for (const file of files) {
        if (!file.dataUrl || !file.dataUrl.includes(',')) continue;
        try {
            const base64 = file.dataUrl.split(',')[1];
            await fs.writeFile(
                historyFilePath(userId, entryId, file.name),
                Buffer.from(base64, 'base64'),
            );
        } catch (err) {
            console.warn(`Failed to write attachment for history entry ${entryId}:`, err);
        }
    }
}
