import { describe, expect, it } from 'vitest';

import { buildPositionForms, buildUnitForms } from './positionForms';

describe('buildPositionForms', () => {
    it('uses the cases imported from Excel', () => {
        expect(
            buildPositionForms({
                position: 'стрілець',
                positionNominative: 'стрілець 1 відділення',
                positionGenitive: 'стрільця 1 відділення',
                positionDative: 'стрільцю 1 відділення',
                positionInstrumental: 'стрільцем 1 відділення',
            }),
        ).toMatchObject({
            nomn: 'стрілець 1 відділення',
            gent: 'стрільця 1 відділення',
            datv: 'стрільцю 1 відділення',
            accs: 'стрільця 1 відділення', // animate: accusative follows the genitive
            ablt: 'стрільцем 1 відділення',
        });
    });

    it('falls back to the plain position when the case columns are missing', () => {
        const forms = buildPositionForms({ position: 'гранатометчик' });
        expect(new Set(Object.values(forms))).toEqual(new Set(['гранатометчик']));
    });

    it('prefers the nominative column over the short position', () => {
        expect(
            buildPositionForms({ position: 'стрілець', positionNominative: 'старший стрілець' })
                .nomn,
        ).toBe('старший стрілець');
    });

    it('returns nothing when there is no position at all', () => {
        expect(buildPositionForms({})).toEqual({});
        expect(buildPositionForms(null)).toEqual({});
    });
});

describe('buildUnitForms', () => {
    it('keeps the unit name exactly as entered in every case', () => {
        const forms = buildUnitForms('1 стрілецька рота');
        expect(new Set(Object.values(forms))).toEqual(new Set(['1 стрілецька рота']));
    });

    it('returns nothing for empty input', () => {
        expect(buildUnitForms('')).toEqual({});
        expect(buildUnitForms(null)).toEqual({});
    });
});
