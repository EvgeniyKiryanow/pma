import { describe, expect, it } from 'vitest';

import {
    requireArray,
    requireBuffer,
    requireInt,
    requireMonthKey,
    requireObject,
    requireOneOf,
    requireString,
} from './validate';

const code = (fn: () => unknown) => {
    try {
        fn();
        return 'no error';
    } catch (error: any) {
        return error.code;
    }
};

describe('requireInt', () => {
    it('accepts integers and numeric strings', () => {
        expect(requireInt(5, 'id')).toBe(5);
        expect(requireInt('42', 'id')).toBe(42);
    });

    it('rejects anything that is not a whole positive number', () => {
        for (const value of [0, -1, 1.5, NaN, Infinity, '', 'abc', null, undefined, {}, []]) {
            expect(code(() => requireInt(value, 'id')), String(value)).toBe('VALIDATION');
        }
    });

    it('honours the allowed range', () => {
        expect(requireInt(0, 'dayIndex', { min: 0, max: 30 })).toBe(0);
        expect(code(() => requireInt(31, 'dayIndex', { min: 0, max: 30 }))).toBe('VALIDATION');
        // A huge index used to be written straight into an array.
        expect(code(() => requireInt(1e9, 'dayIndex', { min: 0, max: 30 }))).toBe('VALIDATION');
    });
});

describe('requireString', () => {
    it('trims and returns the text', () => {
        expect(requireString('  наказ  ', 'title')).toBe('наказ');
    });

    it('rejects empty text unless allowed', () => {
        expect(code(() => requireString('   ', 'title'))).toBe('VALIDATION');
        expect(requireString('', 'title', { allowEmpty: true })).toBe('');
    });

    it('rejects text over the limit and non-strings', () => {
        expect(code(() => requireString('x'.repeat(11), 'title', { maxLength: 10 }))).toBe('VALIDATION');
        expect(code(() => requireString(5, 'title'))).toBe('VALIDATION');
    });
});

describe('requireOneOf', () => {
    it('accepts a known value', () => {
        expect(requireOneOf('exclude', 'type', ['order', 'exclude', 'restore'] as const)).toBe('exclude');
    });

    it('rejects anything else', () => {
        expect(code(() => requireOneOf('drop table', 'type', ['order'] as const))).toBe('VALIDATION');
    });
});

describe('requireMonthKey', () => {
    it('accepts a month key', () => {
        expect(requireMonthKey('2026-09')).toBe('2026-09');
        expect(requireMonthKey('2026-01')).toBe('2026-01');
    });

    it('rejects broken keys', () => {
        for (const value of ['2026-13', '2026-00', '26-09', '2026-9', '2026-09-01', 'abc', '']) {
            expect(code(() => requireMonthKey(value)), value).toBe('VALIDATION');
        }
    });
});

describe('requireArray / requireObject', () => {
    it('accepts the right shapes', () => {
        expect(requireArray([1, 2], 'rows')).toEqual([1, 2]);
        expect(requireObject({ id: 1 }, 'user')).toEqual({ id: 1 });
    });

    it('rejects the wrong shapes and oversized arrays', () => {
        expect(code(() => requireArray('nope', 'rows'))).toBe('VALIDATION');
        expect(code(() => requireArray(new Array(11).fill(0), 'rows', { maxLength: 10 }))).toBe('VALIDATION');
        expect(code(() => requireObject([], 'user'))).toBe('VALIDATION');
        expect(code(() => requireObject(null, 'user'))).toBe('VALIDATION');
    });
});

describe('requireBuffer', () => {
    it('accepts an ArrayBuffer and a view', () => {
        expect(requireBuffer(new ArrayBuffer(4), 'file')).toHaveLength(4);
        expect(requireBuffer(new Uint8Array([1, 2, 3]), 'file')).toHaveLength(3);
    });

    it('rejects other values and oversized payloads', () => {
        expect(code(() => requireBuffer('file', 'file'))).toBe('VALIDATION');
        expect(code(() => requireBuffer(new ArrayBuffer(11), 'file', { maxBytes: 10 }))).toBe('VALIDATION');
    });
});
