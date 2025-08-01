import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export default async function saveHistoryFiles(
    userId: number,
    entryId: number,
    files: { name: string; type: string; dataUrl?: string }[],
) {
    const uploadDir = path.join(
        app.getPath('userData'),
        'history_files',
        `${userId}`,
        `${entryId}`,
    );
    await fs.mkdir(uploadDir, { recursive: true });

    for (const file of files) {
        if (!file.dataUrl || !file.dataUrl.includes(',')) {
            console.warn(`Skipping file "${file.name}" due to missing or invalid dataUrl`);
            continue;
        }

        try {
            const base64 = file.dataUrl.split(',')[1];
            const buffer = Buffer.from(base64, 'base64');
            const filePath = path.join(uploadDir, file.name);
            await fs.writeFile(filePath, buffer);
        } catch (err) {
            console.warn(`Failed to write file "${file.name}":`, err);
        }
    }
}
