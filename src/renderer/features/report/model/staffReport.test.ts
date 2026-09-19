import { describe, expect, it } from 'vitest';

import type { User } from '../../../../shared/types/user';
import type { ShtatnaPosada } from '../../../entities/shtatna-posada/model/useShtatniStore';
import {
    activeFilterCount,
    buildStaffRows,
    EMPTY_STAFF_FILTER,
    facetOf,
    filterStaffRows,
    NO_VALUE,
    sortStaffRows,
    type StaffFilter,
    VACANT,
} from './staffReport';

const post = (no: string, unit: string, position: string, category = 'с-д', extra = {}) =>
    ({
        shtat_number: no,
        unit_name: unit,
        position_name: position,
        category,
        extra_data: extra,
    }) as unknown as ShtatnaPosada;

const person = (id: number, no: string, fields: Partial<User>) =>
    ({ id, shpkNumber: no, fullName: `Особа ${id}`, ...fields }) as User;

const POSTS = [
    post('10', '1-й взвод', 'Командир взводу', 'оф'),
    post('2', 'Управління роти', 'Заступник командира роти', 'оф'),
    post('11', '1-й взвод', 'Кулеметник'),
    post('12', '1-й взвод', 'Снайпер', 'с-д', { statusNote: 'дубль статусу' }),
    post('20', '2-й взвод', 'Кулеметник'),
    post('21', '2-й взвод', ''),
];
const USERS = [
    person(1, '10', { rank: 'лейтенант', taxId: '3000000001', soldierStatus: 'Позиція піхоти' }),
    person(2, '2', { rank: 'капітан', taxId: '3000000002', soldierStatus: 'Управління' }),
    person(3, '11', {
        fullName: 'Дем’янчук Мар’ян',
        rank: 'солдат',
        soldierStatus: 'Відпустка',
        awardRecords: [{ id: 'a', awardId: 'mod-iron-cross', status: 'awarded' }] as never,
    }),
    person(4, '12', { rank: '', taxId: '3000000004', soldierStatus: 'Шпиталь / Лікарня' }),
];
const PERIODS = [{ userId: 3, from: '2026-09-10', to: '2026-09-25' }];
const ROWS = buildStaffRows(POSTS, USERS, PERIODS);
const filter = (patch: Partial<StaffFilter>) => ({ ...EMPTY_STAFF_FILTER, ...patch });
const numbers = (patch: Partial<StaffFilter>) =>
    filterStaffRows(ROWS, filter(patch)).map((row) => row.shtatNumber);

describe('rows of the staff report', () => {
    it('one per position, in the order of the БЧС, with the person and the latest period', () => {
        expect(ROWS.map((row) => row.shtatNumber)).toEqual(['2', '10', '11', '12', '20', '21']);
        expect(ROWS[2]).toMatchObject({
            fullName: 'Дем’янчук Мар’ян',
            dateFrom: '2026-09-10',
            dateTo: '2026-09-25',
            absenceReason: expect.any(String),
        });
        expect(ROWS[4]).toMatchObject({ userId: null, fullName: '' });
    });
});

describe('filters', () => {
    it('nothing chosen shows everything', () => {
        expect(activeFilterCount(EMPTY_STAFF_FILTER)).toBe(0);
        expect(numbers({})).toHaveLength(6);
    });

    it('search finds every word anywhere, apostrophes aside', () => {
        expect(numbers({ query: "дем'янчук" })).toEqual(['11']);
        expect(numbers({ query: '1-й кулеметник' })).toEqual(['11']);
        expect(numbers({ query: '3000000002' })).toEqual(['2']);
    });

    it('lists: unit, position, rank, category, status, with «vacant» and «not set»', () => {
        expect(numbers({ units: ['2-й взвод'] })).toEqual(['20', '21']);
        expect(numbers({ positions: ['Кулеметник'] })).toEqual(['11', '20']);
        expect(numbers({ positions: [NO_VALUE] })).toEqual(['21']);
        expect(numbers({ ranks: ['капітан', 'лейтенант'] })).toEqual(['2', '10']);
        expect(numbers({ ranks: [NO_VALUE] })).toEqual(['12']);
        expect(numbers({ categories: ['оф'] })).toEqual(['2', '10']);
        expect(numbers({ statuses: [VACANT] })).toEqual(['20', '21']);
        expect(numbers({ units: ['1-й взвод'], categories: ['с-д'] })).toEqual(['11', '12']);
    });

    it('occupied / vacant and in the area / absent', () => {
        expect(numbers({ occupancy: 'vacant' })).toEqual(['20', '21']);
        expect(numbers({ occupancy: 'filled' })).toEqual(['2', '10', '11', '12']);
        expect(numbers({ presence: 'present' })).toEqual(['2', '10']);
        expect(numbers({ presence: 'absent' })).toEqual(['11', '12']);
    });

    it('notes, awards, incomplete data', () => {
        expect(numbers({ withNote: true })).toEqual(['12']);
        expect(numbers({ withAwards: true })).toEqual(['11']);
        // No tax number (3) or no rank (4); vacancies are not «incomplete people».
        expect(numbers({ incomplete: true })).toEqual(['11', '12']);
    });

    it('a status in effect on the chosen days', () => {
        expect(numbers({ periodFrom: '2026-09-20', periodTo: '2026-09-30' })).toEqual(['11']);
        expect(numbers({ periodFrom: '2026-10-01' })).toEqual([]);
        expect(numbers({ periodTo: '2026-09-10' })).toEqual(['11']);
    });

    it('counts of each choice follow the other conditions', () => {
        const units = facetOf(ROWS, filter({ occupancy: 'vacant' }), 'units');
        // Units and positions keep the order of the БЧС.
        expect(units).toEqual([
            { value: 'Управління роти', count: 0 },
            { value: '1-й взвод', count: 0 },
            { value: '2-й взвод', count: 2 },
        ]);
        // A list does not narrow its own choices.
        const ranks = facetOf(ROWS, filter({ ranks: ['капітан'] }), 'ranks');
        expect(ranks.find((r) => r.value === 'лейтенант')?.count).toBe(1);
        expect(ranks.at(-1)).toEqual({ value: VACANT, count: 2 });
    });
});

describe('sorting', () => {
    it('by a column, both ways, empty cells last; null keeps the БЧС order', () => {
        const byName = sortStaffRows(ROWS, { key: 'fullName', direction: 'asc' });
        expect(byName.map((row) => row.fullName).slice(-2)).toEqual(['', '']);
        expect(byName[0].fullName).toBe('Дем’янчук Мар’ян');
        const byNumber = sortStaffRows(ROWS, { key: 'shtatNumber', direction: 'desc' });
        expect(byNumber.map((row) => row.shtatNumber)).toEqual(['21', '20', '12', '11', '10', '2']);
        expect(sortStaffRows(ROWS, null)).toBe(ROWS);
    });
});
