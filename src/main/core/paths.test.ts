import path from 'path';
import { describe, expect, it } from 'vitest';

import { resolveInside, safeFileName } from './paths';

const base = path.resolve('C:/pma-data/history_files');

describe('resolveInside', () => {
    it('joins segments inside the base folder', () => {
        expect(resolveInside(base, '12', '77', 'наказ.pdf')).toBe(path.join(base, '12', '77', 'наказ.pdf'));
    });

    it('refuses to step outside with ..', () => {
        expect(() => resolveInside(base, '..', 'users.db')).toThrow();
        expect(() => resolveInside(base, '12', '..', '..', '..', 'windows')).toThrow();
    });

    it('refuses an absolute path', () => {
        expect(() => resolveInside(base, 'C:/windows/system32')).toThrow();
    });

    it('refuses the base folder itself', () => {
        expect(() => resolveInside(base, '.')).toThrow();
    });
});

describe('safeFileName', () => {
    it('keeps a normal name, including Ukrainian letters', () => {
        expect(safeFileName('наказ №5.docx')).toBe('наказ №5.docx');
    });

    it('drops any folders from the name', () => {
        expect(safeFileName('../../etc/passwd')).toBe('passwd');
        expect(safeFileName('C:\\windows\\system32\\cmd.exe')).toBe('cmd.exe');
    });

    it('replaces characters Windows does not allow', () => {
        expect(safeFileName('звіт:2026?.docx')).toBe('звіт_2026_.docx');
    });

    it('rejects names that carry no file name', () => {
        expect(() => safeFileName('')).toThrow();
        expect(() => safeFileName('..')).toThrow();
        expect(() => safeFileName('   ')).toThrow();
    });
});
