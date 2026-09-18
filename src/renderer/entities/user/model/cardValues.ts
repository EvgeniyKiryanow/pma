import type { ShtatnaPosada } from '../../shtatna-posada/model/useShtatniStore';

/** Is a value of a card field filled in (for progress and the card view). */
export function isFilled(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (Array.isArray(value)) return value.length > 0;
    return String(value).trim() !== '' && String(value) !== '0';
}

/** A value of the raw Excel row of a position by its heading («ВОС», «Тарифний розряд»). */
export function staffExtra(position: ShtatnaPosada | undefined, heading: RegExp): string {
    const extra = position?.extra_data ?? {};
    const key = Object.keys(extra).find((k) => heading.test(k.trim()));
    const value = key ? extra[key] : '';
    return value === null || value === undefined ? '' : String(value).trim();
}

export const VOS_HEADING = /^вос(\s|$)/i;
export const PAY_GRADE_HEADING = /тариф/i;
