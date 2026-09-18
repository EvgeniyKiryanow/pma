import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DocxPdfConverter, findSoffice, type ProcessRunner } from './DocxPdfConverter';

let root: string;

beforeEach(async () => {
    root = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-pdf-'));
});

afterEach(async () => {
    await fsp.rm(root, { recursive: true, force: true });
});

describe('DOCX → PDF preview', () => {
    it('keeps LibreOffice and the files inside the app folder and removes them afterwards', async () => {
        let args: string[] = [];
        const fakeSoffice: ProcessRunner = async (_file, runArgs) => {
            args = runArgs;
            const outDir = runArgs[runArgs.indexOf('--outdir') + 1];
            await fsp.writeFile(path.join(outDir, 'рапорт.pdf'), '%PDF-1.4 test');
        };
        const converter = new DocxPdfConverter(() => root, fakeSoffice);

        const pdf = await converter.convert(Buffer.from('docx'), 'рапорт.docx');

        expect(pdf.toString()).toBe('%PDF-1.4 test');
        const profile = args.find((arg) => arg.startsWith('-env:UserInstallation='));
        expect(profile).toBeDefined();
        const profilePath = decodeURIComponent(new URL(profile!.split('=')[1]).pathname);
        expect(path.resolve(profilePath.replace(/^\/([A-Za-z]:)/, '$1'))).toContain(
            path.resolve(root),
        );
        expect(await fsp.readdir(root)).toEqual([]);
    });

    it('cleans up when the conversion fails', async () => {
        const failing: ProcessRunner = async () => {
            throw new Error('soffice not found');
        };
        const converter = new DocxPdfConverter(() => root, failing);
        await expect(converter.convert(Buffer.from('docx'), 'рапорт.docx')).rejects.toThrow();
        expect(fs.existsSync(root) ? await fsp.readdir(root) : []).toEqual([]);
    });
});

describe('finding LibreOffice', () => {
    it('uses the standard install folder on Windows and macOS', () => {
        const windows = findSoffice(
            'win32',
            { ProgramFiles: 'C:\\Program Files', 'ProgramFiles(x86)': 'C:\\Program Files (x86)' },
            (file) => file.includes('(x86)'),
        );
        expect(windows).toBe('C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe');
        expect(findSoffice('darwin', {}, () => true)).toBe(
            '/Applications/LibreOffice.app/Contents/MacOS/soffice',
        );
    });

    it('falls back to PATH when it is not in a standard folder', () => {
        expect(findSoffice('win32', { ProgramFiles: 'C:\\Program Files' }, () => false)).toBe(
            'soffice',
        );
        expect(findSoffice('linux', {}, () => true)).toBe('soffice');
    });
});
