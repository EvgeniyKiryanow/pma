import { execFile } from 'child_process';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

import { withTempDir } from '../core/fsUtils';
import { resolveInside, safeFileName } from '../core/paths';

const CONVERSION_TIMEOUT_MS = 90_000;

/**
 * The LibreOffice installer puts `soffice` on PATH only on Linux. On Windows and macOS it
 * lives in the standard install folder, so look there first.
 */
export function findSoffice(
    platform: NodeJS.Platform = process.platform,
    env: NodeJS.ProcessEnv = process.env,
    exists: (file: string) => boolean = fs.existsSync,
): string {
    const candidates =
        platform === 'win32'
            ? [env.ProgramFiles, env['ProgramFiles(x86)']]
                  .filter((dir): dir is string => Boolean(dir))
                  .map((dir) => path.win32.join(dir, 'LibreOffice', 'program', 'soffice.exe'))
            : platform === 'darwin'
              ? ['/Applications/LibreOffice.app/Contents/MacOS/soffice']
              : [];
    return candidates.find((file) => exists(file)) ?? 'soffice';
}

export type ProcessRunner = (file: string, args: string[], timeoutMs: number) => Promise<void>;

const runProcess: ProcessRunner = (file, args, timeoutMs) =>
    new Promise((resolve, reject) =>
        execFile(file, args, { windowsHide: true, timeout: timeoutMs }, (err) =>
            err ? reject(err) : resolve(),
        ),
    );

/**
 * DOCX → PDF preview through LibreOffice (`soffice`), when it is installed.
 * Arguments are passed without a shell, so file names cannot inject commands.
 *
 * Nothing is left behind: the document, the PDF and LibreOffice's own profile (which would
 * otherwise go to %APPDATA%\LibreOffice and remember the file) live in a folder inside the
 * app's data that is deleted as soon as the PDF has been read.
 */
export class DocxPdfConverter {
    constructor(
        private readonly workRoot: () => string,
        private readonly run: ProcessRunner = runProcess,
        private readonly soffice: () => string = () => findSoffice(),
    ) {}

    /** Returns the PDF content. */
    async convert(content: Buffer, fileName: string): Promise<Buffer> {
        await fsp.mkdir(this.workRoot(), { recursive: true });
        return withTempDir(this.workRoot(), 'pdf', async (dir) => {
            const docxPath = resolveInside(dir, safeFileName(fileName));
            const pdfPath = path.join(dir, `${path.parse(docxPath).name}.pdf`);
            await fsp.writeFile(docxPath, content);

            const profile = pathToFileURL(path.join(dir, 'lo-profile')).href;
            await this.run(
                this.soffice(),
                [
                    `-env:UserInstallation=${profile}`,
                    '--headless',
                    '--norestore',
                    '--convert-to',
                    'pdf',
                    '--outdir',
                    dir,
                    docxPath,
                ],
                CONVERSION_TIMEOUT_MS,
            );
            try {
                return await fsp.readFile(pdfPath);
            } catch {
                throw new Error('PDF not created');
            }
        });
    }
}
