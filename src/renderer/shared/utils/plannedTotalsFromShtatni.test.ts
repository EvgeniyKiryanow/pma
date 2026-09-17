import { describe, expect, it } from 'vitest';

import { buildPlannedTotalsFromShtatni } from './plannedTotalsFromShtatni';

const position = (unit: string, category = 'Сол') => ({ unit_name: unit, category });

describe('buildPlannedTotalsFromShtatni', () => {
    it('counts positions per unit and splits officers from soldiers', () => {
        const totals = buildPlannedTotalsFromShtatni([
            position('Управління роти', 'Оф'),
            position('Управління роти', 'Оф'),
            position('Управління роти', 'Сол'),
            position('1-й взвод', 'Оф'),
            position('1-й взвод', 'Сер'),
        ]);

        expect(totals['Управління роти']).toEqual({ total: 3, officer: 2, soldier: 1 });
        expect(totals['1-й взвод']).toEqual({ total: 2, officer: 1, soldier: 1 });
    });

    it('brings different spellings of a platoon to one key', () => {
        const totals = buildPlannedTotalsFromShtatni([
            position('1-й взвод'),
            position('1 взвод'),
            position('1-взвод'),
            position('управління 1 взводу'),
            position('2 відділення 1 взводу'),
        ]);

        expect(totals['1-й взвод'].total).toBe(5);
    });

    it('keeps platoons apart', () => {
        const totals = buildPlannedTotalsFromShtatni([
            position('1-й взвод'),
            position('2 взвод'),
            position('3-й взвод'),
        ]);

        expect(totals['1-й взвод'].total).toBe(1);
        expect(totals['2-й взвод'].total).toBe(1);
        expect(totals['3-й взвод'].total).toBe(1);
    });

    it('recognizes the company HQ by wording', () => {
        const totals = buildPlannedTotalsFromShtatni([
            position('Управління роти'),
            position('управління роти'),
        ]);
        expect(totals['Управління роти'].total).toBe(2);
    });

    it('excludes attached personnel from planning', () => {
        const totals = buildPlannedTotalsFromShtatni([
            position('1-й взвод'),
            position('Прикомандировані'),
        ]);

        expect(totals['Прикомандировані']).toBeUndefined();
        expect(totals['ВСЬОГО'].total).toBe(1);
    });

    it('ignores rows without a unit', () => {
        const totals = buildPlannedTotalsFromShtatni([position(''), position('   '), position('1-й взвод')]);
        expect(totals['ВСЬОГО'].total).toBe(1);
    });

    it('detects officers by the category text', () => {
        const totals = buildPlannedTotalsFromShtatni([
            position('1-й взвод', 'Оф'),
            position('1-й взвод', 'офіцер'),
            position('1-й взвод', 'Сол'),
            position('1-й взвод', ''),
        ]);
        expect(totals['1-й взвод']).toEqual({ total: 4, officer: 2, soldier: 2 });
    });

    it('sums everything into ВСЬОГО', () => {
        const totals = buildPlannedTotalsFromShtatni([
            position('Управління роти', 'Оф'),
            position('1-й взвод', 'Сол'),
            position('2-й взвод', 'Сол'),
        ]);
        expect(totals['ВСЬОГО']).toEqual({ total: 3, officer: 1, soldier: 2 });
    });

    it('returns only ВСЬОГО for an empty staffing table', () => {
        expect(buildPlannedTotalsFromShtatni([])).toEqual({
            ВСЬОГО: { total: 0, officer: 0, soldier: 0 },
        });
    });
});
