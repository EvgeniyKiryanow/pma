import { AppError } from '../../shared/ipc/result';

/**
 * Small input guards for IPC arguments. The renderer is our own code, but a mistake there
 * (or a stray value from an imported file) must not reach SQL or grow an array to a
 * gigabyte, so every argument that indexes or identifies something is checked here.
 */

export function requireInt(
    value: unknown,
    field: string,
    { min = 1, max = Number.MAX_SAFE_INTEGER } = {},
): number {
    const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed < min || parsed > max) {
        throw new AppError('VALIDATION', undefined, { field, min, max });
    }
    return parsed;
}

export function requireString(
    value: unknown,
    field: string,
    { maxLength = 1000, allowEmpty = false } = {},
): string {
    if (typeof value !== 'string') throw new AppError('VALIDATION', undefined, { field });
    const text = value.trim();
    if (!allowEmpty && !text) throw new AppError('VALIDATION', undefined, { field });
    if (value.length > maxLength) throw new AppError('VALIDATION', undefined, { field, maxLength });
    return text;
}

export function requireOneOf<T extends string>(
    value: unknown,
    field: string,
    allowed: readonly T[],
): T {
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
        throw new AppError('VALIDATION', undefined, { field, allowed });
    }
    return value as T;
}

/** Month key of a named list table, e.g. "2026-09". */
export function requireMonthKey(value: unknown, field = 'key'): string {
    const text = requireString(value, field, { maxLength: 7 });
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) {
        throw new AppError('VALIDATION', undefined, { field, expected: 'YYYY-MM' });
    }
    return text;
}

/** Optional range of calendar days `{ from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }`. */
export function optionalDayRange(
    value: unknown,
    field = 'range',
): { from: string; to: string } | undefined {
    if (value === undefined || value === null) return undefined;
    const range = requireObject(value, field);
    const day = (part: unknown, name: string) => {
        const text = requireString(part, `${field}.${name}`, { maxLength: 10 });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
            throw new AppError('VALIDATION', undefined, { field, expected: 'YYYY-MM-DD' });
        }
        return text;
    };
    return { from: day(range.from, 'from'), to: day(range.to, 'to') };
}

export function requireArray<T>(value: unknown, field: string, { maxLength = 100_000 } = {}): T[] {
    if (!Array.isArray(value)) throw new AppError('VALIDATION', undefined, { field });
    if (value.length > maxLength) throw new AppError('VALIDATION', undefined, { field, maxLength });
    return value as T[];
}

export function requireObject(value: unknown, field: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new AppError('VALIDATION', undefined, { field });
    }
    return value as Record<string, unknown>;
}

/** Binary payload coming from the renderer (uploaded template, generated report…). */
export function requireBuffer(
    value: unknown,
    field: string,
    { maxBytes = 200 * 1024 * 1024 } = {},
): Buffer {
    if (value instanceof ArrayBuffer) {
        if (value.byteLength > maxBytes)
            throw new AppError('VALIDATION', undefined, { field, maxBytes });
        return Buffer.from(value);
    }
    if (ArrayBuffer.isView(value)) {
        const view = value as ArrayBufferView;
        if (view.byteLength > maxBytes)
            throw new AppError('VALIDATION', undefined, { field, maxBytes });
        return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
    }
    throw new AppError('VALIDATION', undefined, { field });
}
