import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

import type { BundledReportTemplate } from '../../shared/types/reports';
import { toArrayBuffer } from './ReportFileStore';

/** DOCX templates shipped with the application (read-only). */
export class BundledTemplateCatalog {
    constructor(private readonly directory: () => string) {}

    async list(): Promise<BundledReportTemplate[]> {
        const dir = this.directory();
        if (!fs.existsSync(dir)) return [];
        const files = (await fsp.readdir(dir)).filter((file) => file.endsWith('.docx'));
        return Promise.all(
            files.map(async (file) => {
                const fullPath = path.join(dir, file);
                const [content, stat] = await Promise.all([
                    fsp.readFile(fullPath),
                    fsp.stat(fullPath),
                ]);
                return {
                    id: file,
                    name: path.basename(file, '.docx'),
                    timestamp: stat.mtimeMs,
                    content: toArrayBuffer(content),
                };
            }),
        );
    }
}
