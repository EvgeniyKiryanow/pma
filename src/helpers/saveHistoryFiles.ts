import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
export default async function saveHistoryFiles(
    userId: number,
    entryId: number,
    files: { name: string; base64: string }[],
) {
    const base = path.join(
        app.getPath('userData'),
        'user_files',
        userId.toString(),
        entryId.toString(),
    );
    await fs.mkdir(base, { recursive: true });

    for (const file of files) {
        const buffer = Buffer.from(file.base64, 'base64');
        const filePath = path.join(base, file.name);
        await fs.writeFile(filePath, buffer);
    }
}
