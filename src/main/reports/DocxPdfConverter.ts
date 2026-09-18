import { execFile } from 'child_process';
import fs from 'fs';
import fsp from 'fs/promises';

import { resolveInside, safeFileName } from '../core/paths';

const CONVERSION_TIMEOUT_MS = 60_000;

/**
 * DOCX → PDF preview through LibreOffice (`soffice`), when it is installed.
 * Arguments are passed without a shell, so file names cannot inject commands.
 */
export class DocxPdfConverter {
    constructor(private readonly workDir: () => string) {}

    /** Returns the path of the created PDF. */
    async convert(content: Buffer, fileName: string): Promise<string> {
        const dir = this.workDir();
        await fsp.mkdir(dir, { recursive: true });
        const docxPath = resolveInside(dir, safeFileName(fileName));
        const pdfPath = docxPath.replace(/\.docx$/i, '.pdf');
        await fsp.writeFile(docxPath, content);

        return new Promise<string>((resolve, reject) => {
            execFile(
                'soffice',
                ['--headless', '--convert-to', 'pdf', '--outdir', dir, docxPath],
                { windowsHide: true, timeout: CONVERSION_TIMEOUT_MS },
                (err) => {
                    if (err || !fs.existsSync(pdfPath)) reject(err || new Error('PDF not created'));
                    else resolve(pdfPath);
                },
            );
        });
    }
}
