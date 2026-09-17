import { describe, expect, it } from 'vitest';

import { declineRank } from './militaryRanks';

describe('declineRank', () => {
    it('declines a simple rank', () => {
        expect(declineRank('солдат')).toMatchObject({
            nomn: 'солдат',
            gent: 'солдата',
            datv: 'солдату',
            accs: 'солдата',
            ablt: 'солдатом',
            voct: 'солдате',
        });
    });

    it('declines both words of a compound rank', () => {
        expect(declineRank('молодший сержант')).toMatchObject({
            nomn: 'молодший сержант',
            gent: 'молодшого сержанта',
            datv: 'молодшому сержанту',
            ablt: 'молодшим сержантом',
        });
    });

    it('declines officer ranks', () => {
        expect(declineRank('старший лейтенант').gent).toBe('старшого лейтенанта');
        expect(declineRank('капітан').datv).toBe('капітану');
        expect(declineRank('підполковник').ablt).toBe('підполковником');
    });

    it('declines only the last part of a hyphenated rank', () => {
        expect(declineRank('штаб-сержант').gent).toBe('штаб-сержанта');
        expect(declineRank('майстер-сержант').datv).toBe('майстер-сержанту');
        expect(declineRank('генерал-майор').ablt).toBe('генерал-майором');
    });

    it('uses the -а pattern for старшина', () => {
        expect(declineRank('старшина')).toMatchObject({
            gent: 'старшини',
            datv: 'старшині',
            accs: 'старшину',
            ablt: 'старшиною',
            voct: 'старшино',
        });
    });

    it('uses -у in the vocative after к/г/х', () => {
        expect(declineRank('полковник').voct).toBe('полковнику');
        expect(declineRank('прапорщик').voct).toBe('прапорщику');
    });

    it('leaves an unknown rank untouched in every case', () => {
        const forms = declineRank('невідоме звання');
        expect(new Set(Object.values(forms))).toEqual(new Set(['невідоме звання']));
    });

    it('returns nothing for empty input', () => {
        expect(declineRank('')).toEqual({});
        expect(declineRank(null)).toEqual({});
        expect(declineRank(undefined)).toEqual({});
    });

    it('is case-insensitive on input', () => {
        expect(declineRank('Старший Сержант').gent).toBe('старшого сержанта');
    });
});
