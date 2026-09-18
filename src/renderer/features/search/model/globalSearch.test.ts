import { describe, expect, it } from 'vitest';

import { findAward } from '../../../../shared/awards/catalog';
import type { User } from '../../../../shared/types/user';
import { fromLatinLayout, globalSearch, highlightRanges, type SearchSources } from './globalSearch';

const user = (id: number, extra: Partial<User>): User =>
    ({ id, fullName: '', rank: '', position: '', phoneNumber: '', ...extra }) as User;

const people = [
    user(1, {
        fullName: 'Шевченко Тарас Григорович',
        callsign: 'Кобзар',
        rank: 'солдат',
        position: 'стрілець-помічник гранатометника',
        shpkNumber: '12',
        taxId: '3012345678',
        phoneNumber: '+38 (050) 123-45-67',
        soldierStatus: 'В районі',
        dateOfBirth: '1990-03-09',
    }),
    user(2, {
        fullName: 'Коваленко Петро',
        rank: 'сержант',
        position: 'командир відділення',
        shpkNumber: '7',
        registeredAddress: 'м. Київ, вул. Шевченка, 5',
    }),
    user(3, {
        fullName: 'Шевчук Ганна',
        rank: 'солдат',
        position: 'кухар',
        shpkNumber: 'excluded',
    }),
];

const sources: SearchSources = {
    users: people,
    positions: [
        {
            shtat_number: '12',
            position_name: 'стрілець-помічник гранатометника',
            unit_name: '1 взвод',
        },
        { shtat_number: '40', position_name: 'водій', unit_name: 'взвод забезпечення' },
    ],
    awards: [
        { award: findAward('order-courage')!, holders: 2 },
        { award: findAward('sbu-valor')!, holders: 0 },
    ],
    reports: [
        { id: 5, name: 'Бойове донесення 18.09.xlsx', filePath: 'x', createdAt: '' } as never,
    ],
    templates: [{ id: 'b:1', name: 'Рапорт на відпустку', source: 'bundled' }],
    sections: [
        {
            key: 'tables',
            label: 'Таблиці та Excel',
            keywords: 'імпорт табель імпульс',
            action: { type: 'tab', tab: 'importUsers' },
        },
    ],
};

const search = (query: string) =>
    globalSearch(query, sources, { fieldLabel: (field) => `[${field}]` });
const keys = (query: string, category?: string) =>
    search(query)
        .filter((hit) => !category || hit.category === category)
        .map((hit) => hit.key);

describe('global search', () => {
    it('finds people by surname, call sign, several words in any order', () => {
        // The address «вул. Шевченка» matches too, but after the names.
        expect(keys('шевч', 'people')).toEqual(['person:1', 'person:3', 'person:2']);
        expect(keys('кобзар', 'people')).toEqual(['person:1']);
        expect(keys('тарас шевченко', 'people')).toEqual(['person:1']);
        expect(keys('солдат кухар', 'people')).toEqual(['person:3']);
    });

    it('matches numbers by their digits: ІПН, phone, staff number, date of birth', () => {
        expect(keys('3012345678', 'people')).toEqual(['person:1']);
        expect(keys('050 123 45 67', 'people')).toEqual(['person:1']);
        // Typed in groups, stored without separators.
        const stored = globalSearch(
            '050 123 45 67',
            { users: [user(9, { fullName: 'Х', phoneNumber: '+380501234567' })] },
            { fieldLabel: (f) => f },
        );
        expect(stored.map((hit) => hit.key)).toEqual(['person:9']);
        expect(keys('09.03.1990', 'people')).toEqual(['person:1']);
        const [hit] = search('3012345678');
        expect(hit.matched).toEqual({ label: '[taxId]', value: '3012345678' });
    });

    it('ranks the name above an address that mentions it, excluded people last', () => {
        expect(keys('шевченк', 'people')).toEqual(['person:1', 'person:2']);
        const address = search('шевченка').find((hit) => hit.key === 'person:2');
        expect(address?.matched?.label).toBe('[registeredAddress]');
    });

    it('understands a query typed with the English layout', () => {
        expect(fromLatinLayout('rj,pfh')).toBe('кобзар');
        expect(fromLatinLayout('кобзар')).toBeNull();
        expect(keys('rj,pfh', 'people')).toEqual(['person:1']);
    });

    it('searches positions (with their holder), awards, reports, templates and sections', () => {
        expect(keys('водій', 'positions')).toEqual(['position:40']);
        expect(keys('шевченко', 'positions')).toEqual(['position:12']);
        expect(keys('мужність', 'awards')).toEqual(['award:order-courage']);
        expect(keys('сбу', 'awards')).toEqual(['award:sbu-valor']);
        expect(keys('донесення', 'reports')).toEqual(['report:5']);
        expect(keys('відпустку', 'templates')).toEqual(['template:b:1']);
        expect(keys('табель', 'sections')).toEqual(['section:tables']);
    });

    it('returns nothing for an empty query and ignores short fragments inside words', () => {
        expect(search('   ')).toEqual([]);
        // «ко» starts «Коваленко» and «Кобзар», but is not looked for inside «Шевченко».
        expect(keys('ко', 'people')).toEqual(['person:1', 'person:2']);
        expect(keys('вче', 'people')).toEqual(['person:1', 'person:2']);
    });

    it('marks the words to highlight', () => {
        expect(highlightRanges('Шевченко Тарас', 'тарас шев')).toEqual([
            [0, 3],
            [9, 14],
        ]);
    });
});
