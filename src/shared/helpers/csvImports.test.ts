import { describe, expect, it } from 'vitest';

import { excelSerialToDate, generateUserKey, needsUpdate, normalizeExcelDate } from './csvImports';

describe('excelSerialToDate', () => {
    // Known Excel serials. These must not depend on the machine's timezone: the earlier
    // implementation used local time and shifted every date one day back east of UTC.
    it.each([
        [1, '1899-12-31'],
        [25569, '1970-01-01'],
        [36526, '2000-01-01'],
        [45000, '2023-03-15'],
    ])('serial %i → %s', (serial, expected) => {
        expect(excelSerialToDate(serial)).toBe(expected);
    });

    it('drops the time part of a fractional serial', () => {
        expect(excelSerialToDate(45000.75)).toBe('2023-03-15');
    });

    it('returns an empty string for junk', () => {
        expect(excelSerialToDate(0)).toBe('');
        expect(excelSerialToDate(NaN)).toBe('');
        expect(excelSerialToDate(-5)).toBe('');
    });
});

describe('normalizeExcelDate', () => {
    it.each([
        ['15.03.2023', '2023-03-15'],
        ['15/03/2023', '2023-03-15'],
        ['15-03-2023', '2023-03-15'],
        ['15/03/23', '2023-03-15'],
        ['2023-03-15', '2023-03-15'],
        ['03/15/2023', '2023-03-15'], // month-first is recognized by the day being > 12
        [45000, '2023-03-15'],
    ])('%s → %s', (input, expected) => {
        expect(normalizeExcelDate(input)).toBe(expected);
    });

    it('handles a Date object', () => {
        expect(normalizeExcelDate(new Date(2023, 2, 15))).toBe('2023-03-15');
    });

    it('keeps unrecognized values as they are instead of inventing a date', () => {
        expect(normalizeExcelDate('не дата')).toBe('не дата');
        expect(normalizeExcelDate('31.02.2023')).toBe('31.02.2023'); // 31 February does not exist
    });

    it('treats empty input as empty', () => {
        expect(normalizeExcelDate('')).toBe('');
        expect(normalizeExcelDate(null)).toBe('');
        expect(normalizeExcelDate(undefined)).toBe('');
    });
});

describe('generateUserKey', () => {
    it('is built from name, date of birth, tax id and staff number', () => {
        const key = generateUserKey({
            fullName: ' Петренко Павло ',
            dateOfBirth: '1990-01-02',
            taxId: '123',
            shpkNumber: '7',
        });
        expect(key).toBe('key_петренко павло_1990-01-02_123_7');
    });

    it('ignores letter case and surrounding spaces', () => {
        const a = generateUserKey({ fullName: 'Петренко Павло', dateOfBirth: '1990-01-02' });
        const b = generateUserKey({ fullName: '  ПЕТРЕНКО ПАВЛО  ', dateOfBirth: '1990-01-02' });
        expect(a).toBe(b);
    });

    it('separates two people with the same name but different birth dates', () => {
        const a = generateUserKey({ fullName: 'Петренко Павло', dateOfBirth: '1990-01-02' });
        const b = generateUserKey({ fullName: 'Петренко Павло', dateOfBirth: '1991-01-02' });
        expect(a).not.toBe(b);
    });
});

describe('needsUpdate', () => {
    it('detects a changed value', () => {
        expect(needsUpdate({ rank: 'солдат' }, { rank: 'сержант' })).toBe(true);
    });

    it('ignores empty incoming values so the import never wipes existing data', () => {
        expect(needsUpdate({ rank: 'солдат' }, { rank: '' })).toBe(false);
        expect(needsUpdate({ rank: 'солдат' }, { rank: undefined })).toBe(false);
    });

    it('reports no update when everything matches', () => {
        expect(needsUpdate({ rank: 'солдат', position: 'стрілець' }, { rank: 'солдат' })).toBe(false);
    });

    it('detects a value that is missing locally', () => {
        expect(needsUpdate({}, { taxId: '123' })).toBe(true);
    });
});
