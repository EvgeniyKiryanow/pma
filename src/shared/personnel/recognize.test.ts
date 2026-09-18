import { describe, expect, it } from 'vitest';

import { dictionaryValue, formatDate, parseDate, recognizeSection } from './recognize';

describe('«Розпізнати»: the free text of older cards into the Impulse fields', () => {
    it('reads a paper passport', () => {
        expect(
            recognizeSection(
                { passportData: 'КН 123456 виданий Шевченківським РВ ГУ 12.03.2005' },
                'passport',
            ),
        ).toEqual({
            passportType: 'Паперовий',
            passportSeries: 'КН',
            passportNumber: '123456',
            passportIssueDate: '12.03.2005',
            passportIssuer: 'Шевченківським РВ ГУ',
        });
    });

    it('reads an address only by its clear marks', () => {
        expect(
            recognizeSection(
                { registeredAddress: 'Київська обл., м. Буча, вул. Шевченка, буд. 5, кв. 12' },
                'registration',
            ),
        ).toEqual({
            regRegion: 'Київська область',
            regSettlement: 'Буча',
            regStreetType: 'вулиця',
            regStreet: 'Шевченка',
            regHouse: '5',
            regFlat: '12',
        });
        expect(recognizeSection({ residenceAddress: 'десь біля річки' }, 'residence')).toEqual({});
    });

    it('turns abbreviations and synonyms into the words of Impulse', () => {
        expect(
            recognizeSection(
                {
                    rank: 'ст. солдат',
                    rankAssignedBy: 'наказ командира в/ч А0000 № 12 від 01.02.2024',
                    serviceType: 'мобілізований',
                    fitnessCategory: 'обмежено придатний',
                },
                'service',
            ),
        ).toEqual({
            rank: 'старший солдат',
            rankAssignmentDate: '01.02.2024',
            rankOrderNumber: '12',
            rankOrderIssuer: 'наказ командира в/ч А0000',
            serviceType: 'За призовом під час мобілізації на особливий період',
            fitnessCategory: 'Обмежено придатний',
        });
    });

    it('puts a daily order into the fields of the daily orders', () => {
        expect(
            recognizeSection(
                { appointmentOrder: 'стройовий наказ № 45 від 03.03.2024' },
                'appointment',
            ),
        ).toEqual({
            drillOrderDate: '03.03.2024',
            drillOrderNumber: '45',
            drillOrderIssuer: 'стройовий наказ',
        });
    });

    it('keeps dictionary values exact and dates as ДД.ММ.РРРР', () => {
        expect(dictionaryValue('ВИЩА', ['Вища'])).toBe('Вища');
        expect(dictionaryValue('щось', ['Вища'])).toBeNull();
        expect(formatDate(parseDate('2024-02-01'))).toBe('01.02.2024');
    });
});
