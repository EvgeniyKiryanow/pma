import { describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';

import type { User } from '../../../../shared/types/user';

vi.mock('../../../shared/lib/download', () => ({ downloadFile: vi.fn() }));

import { buildImpulseWorkbook } from '../excel/generateImpulseExcel';
import { IMPULSE_COLUMNS } from './impulseExport';
import {
    cellDate,
    detectImpulseSheet,
    IMPULSE_TARGETS,
    planImpulseImport,
    readImpulseEducation,
    readImpulsePersonnel,
    type SheetRows,
    taxIdOf,
} from './impulseImport';

/** A card with every field of the Impulse form filled. */
const FULL: Partial<User> = {
    id: 7,
    fullName: 'Тестенко Петро Іванович',
    taxId: '3012345678',
    gender: 'male',
    dateOfBirth: '12.03.1990',
    callsign: 'Грім',
    passportIssuer: 'Оболонський РВ',
    passportIssueDate: '01.02.2010',
    passportSeries: 'СН',
    passportNumber: '123456',
    passportType: 'Паперовий',
    foreignPassportIssuer: '8000',
    foreignPassportIssueDate: '05.06.2018',
    foreignPassportNumber: 'FA123456',
    vosCode: '100915',
    militaryTicketIssuer: 'Оболонський ТЦК',
    militaryTicketIssueDate: '10.10.2012',
    militaryTicketSeries: 'АА',
    militaryTicketNumber: '654321',
    ubdIssuer: 'в/ч А0000',
    ubdIssueDate: '11.11.2023',
    ubdSeries: 'АБ',
    ubdNumber: '777777',
    iban: 'UA213223130000026007233566001',
    bankCard: '4149439012345678',
    bankName: 'ПриватБанк',
    driverLicenseIssuer: 'ТСЦ 8041',
    driverLicenseCategories: 'B,C1',
    driverLicenseValidUntil: '01.01.2030',
    driverLicenseIssueDate: '01.01.2015',
    drivingExperience: '9',
    driverLicenseSeries: 'ВХН',
    driverLicenseNumber: '123123',
    tractorLicenseIssuer: 'Держпродспоживслужба',
    tractorLicenseCategories: 'A1',
    tractorLicenseValidUntil: '02.02.2031',
    tractorLicenseIssueDate: '02.02.2016',
    tractorExperience: '3',
    tractorLicenseSeries: 'ТР',
    tractorLicenseNumber: '456456',
    regRegion: 'Київська область',
    regDistrict: 'Бучанський',
    regSettlement: 'Ірпінь',
    regCityDistrict: 'Центр',
    regStreetType: 'вулиця',
    regStreet: 'Соборна',
    regHouse: '12А',
    regFlat: '5',
    liveRegion: 'Київ',
    liveDistrict: 'Оболонський',
    liveSettlement: 'Київ',
    liveCityDistrict: 'Оболонь',
    liveStreetType: 'проспект',
    liveStreet: 'Героїв Сталінграда',
    liveHouse: '4',
    liveFlat: '17',
    phoneNumber: '+380501234567',
    extraPhone: '+380671234567',
    email: 'test@example.com',
    rank: 'старший солдат',
    rankAssignmentDate: '01.03.2024',
    rankOrderNumber: '55',
    rankOrderIssuer: 'в/ч А1111',
    appointmentOrderDate: '02.03.2024',
    appointmentOrderNumber: '12-ОС',
    appointmentOrderIssuer: 'в/ч А2222',
    drillOrderDate: '03.03.2024',
    drillOrderNumber: '77',
    drillOrderIssuer: 'в/ч А3333',
    bzvpFrom: '01.01.2024',
    bzvpTo: '01.02.2024',
    bzvpPlace: 'в/ч А4444',
    bzvpCommander: 'Командир',
    bzvpComment: 'без зауважень',
    citizenship: 'Україна',
    birthCountry: 'Україна',
    placeOfBirth: 'м. Київ',
    maritalStatus: 'Одружений / Заміжня',
    nationality: 'українець',
    religion: 'православний',
    tags: 'водій,зв’язок',
    academicTitle: 'Доцент',
    academicTitleAssignedBy: 'МОН',
    academicTitleDate: '04.04.2019',
    scientificWorks: 'Праця',
    electedBody: 'Рада',
    electedDate: '05.05.2020',
    electedUntil: '05.05.2025',
    electedPosition: 'депутат',
    bloodType: 'A(II)+',
    fitnessCategory: 'Придатний',
    oathDate: '06.06.2023',
    militaryServiceHistory: '2014–2016',
    serviceType: 'За контрактом',
    conscriptionDate: '07.07.2023',
    enlistmentOrderDate: '08.07.2023',
    enlistmentOrderNumber: '99',
    recruitmentOfficeDetails: 'Київський ТЦК',
    recruitingOffice: 'Оболонський ТЦК',
    serviceLengthDate: '09.09.2026',
    serviceLength: '03-02-01',
    preferentialServiceLengthDate: '09.09.2026',
    preferentialServiceLength: '04-00-00',
    relatives: [
        {
            name: 'Тестенко Марія Петрівна',
            relationship: 'мати',
            phone: '+380501112233',
            notes: 'м. Київ',
        },
        { name: 'Тестенко Ірина', relationship: 'дружина' },
    ],
    childrenInfo: 'Тестенко Олег, 2015',
    educationList: [
        {
            id: 'e1',
            type: 'Цивільна',
            level: 'Вища',
            form: 'Заочна',
            institution: 'КНУ',
            institutionType: 'Навчальний заклад',
            specialty: 'Право',
            startYear: '2008',
            endYear: '2013',
        },
    ],
};

/** The workbook as the import reads it: every sheet as rows of raw cells. */
async function rowsOf(users: Partial<User>[]): Promise<Record<string, SheetRows>> {
    const wb = await buildImpulseWorkbook(users as User[]);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const book = XLSX.read(buffer, { type: 'buffer' });
    return Object.fromEntries(
        book.SheetNames.map((name) => [
            name,
            XLSX.utils.sheet_to_json<SheetRows[number]>(book.Sheets[name], {
                header: 1,
                raw: true,
                defval: null,
            }),
        ]),
    );
}

function read(sheets: Record<string, SheetRows>) {
    const personnel = sheets['Особовий склад'];
    const education = sheets['Освіта і курси'];
    const personnelLayout = detectImpulseSheet(personnel)!;
    const educationLayout = detectImpulseSheet(education)!;
    return {
        personnelLayout,
        educationLayout,
        people: readImpulsePersonnel(personnel, personnelLayout),
        education: readImpulseEducation(education, educationLayout),
    };
}

describe('the columns', () => {
    it('every column of Додаток 1 has a place in the card', () => {
        expect(IMPULSE_TARGETS).toHaveLength(IMPULSE_COLUMNS.length);
    });
});

describe('the workbook of Impulse', () => {
    it('finds both forms and every column of them', async () => {
        const { personnelLayout, educationLayout } = read(await rowsOf([FULL]));
        expect(personnelLayout).toMatchObject({ kind: 'personnel', dataFrom: 4, found: 108 });
        expect(educationLayout).toMatchObject({ kind: 'education', dataFrom: 3, found: 12 });
    });

    it('brings every field back as it was exported', async () => {
        const { people, education } = read(await rowsOf([FULL]));
        const plan = planImpulseImport(people, education, []);
        expect(plan.create).toHaveLength(1);
        const card = plan.create[0] as Record<string, unknown>;
        for (const target of IMPULSE_TARGETS) {
            if (!('field' in target) || target.field === 'notes') continue;
            expect([target.field, card[target.field]]).toEqual([
                target.field,
                (FULL as Record<string, unknown>)[target.field],
            ]);
        }
        expect(card.fullName).toBe(FULL.fullName);
        expect(card.childrenInfo).toBe(FULL.childrenInfo);
        expect(card.recruitmentOfficeDetails).toBe('Київський ТЦК');
        expect(card.relatives).toEqual([
            {
                name: 'Тестенко Марія Петрівна',
                relationship: 'батьки',
                phone: '+380501112233',
                notes: 'м. Київ',
            },
            { name: 'Тестенко Ірина', relationship: 'дружина / чоловік' },
        ]);
        expect(plan.education).toBe(1);
        expect(card.educationList).toEqual([
            expect.objectContaining({
                type: 'Цивільна',
                level: 'Вища',
                institution: 'КНУ',
                specialty: 'Право',
                startYear: '2008',
                endYear: '2013',
            }),
        ]);
    });

    it('changes nothing when the card already says the same', async () => {
        const { people, education } = read(await rowsOf([FULL]));
        const plan = planImpulseImport(people, education, [FULL as User]);
        expect(plan.create).toEqual([]);
        expect(plan.update).toEqual([]);
        expect(plan.unchanged).toBe(1);
    });

    it('updates only the fields that differ and never empties one', async () => {
        const { people, education } = read(
            await rowsOf([{ ...FULL, rank: 'сержант', phoneNumber: '', vosCode: '' }]),
        );
        const current = { ...FULL, rank: 'ст. солдат', notes: 'моя примітка' } as User;
        const plan = planImpulseImport(people, education, [current]);
        expect(plan.update).toHaveLength(1);
        expect(plan.update[0].fields).toEqual(['rank']);
        expect(plan.update[0].next).toMatchObject({
            rank: 'сержант',
            phoneNumber: FULL.phoneNumber,
            vosCode: FULL.vosCode,
            notes: 'моя примітка',
        });
    });
});

describe('matching people', () => {
    const plain = (fullName: string, extra: Partial<User> = {}) =>
        ({ id: Math.floor(Math.random() * 1e6), fullName, ...extra }) as User;

    it('by РНОКПП first, then by name and date of birth', async () => {
        const { people } = read(await rowsOf([{ ...FULL, fullName: 'Тестенко Петро' }]));
        const byTax = planImpulseImport(
            people,
            [],
            [plain('Інше Імʼя', { taxId: '3012345678', id: 1 })],
        );
        expect(byTax.update[0]?.user.id).toBe(1);

        const twins = [
            plain('Тестенко Петро', { id: 2, dateOfBirth: '1990-03-12' }),
            plain('Тестенко Петро', { id: 3, dateOfBirth: '01.01.1985' }),
        ];
        const noTax = people.map((p) => ({ ...p, taxId: null }));
        expect(planImpulseImport(noTax, [], twins).update[0]?.user.id).toBe(2);
    });

    it('leaves a row that fits several people alone', async () => {
        const { people } = read(await rowsOf([{ ...FULL, taxId: '', dateOfBirth: '' }]));
        const plan = planImpulseImport(
            people,
            [],
            [plain(FULL.fullName!, { id: 1 }), plain(FULL.fullName!, { id: 2 })],
        );
        expect(plan.ambiguous).toEqual([{ row: 5, fullName: FULL.fullName, sheet: 'personnel' }]);
        expect(plan.update).toEqual([]);
        expect(plan.create).toEqual([]);
    });

    it('matches names written with another apostrophe or case', async () => {
        const { people } = read(
            await rowsOf([{ ...FULL, fullName: "Мар'яненко Ігор", taxId: '' }]),
        );
        const plan = planImpulseImport(people, [], [plain('МАРʼЯНЕНКО ІГОР', { id: 9 })]);
        expect(plan.update[0]?.user.id).toBe(9);
    });

    it('makes one card of a person written twice', async () => {
        const { people } = read(
            await rowsOf([
                { ...FULL, callsign: '' },
                { ...FULL, id: 8, callsign: 'Грім' },
            ]),
        );
        const plan = planImpulseImport(people, [], []);
        expect(plan.create).toHaveLength(1);
        expect(plan.create[0].callsign).toBe('Грім');
    });
});

describe('a template filled by hand in Impulse', () => {
    /** The layout of the real Impulse template: a leading space, numbers as numbers. */
    const template = (): SheetRows => {
        const groups: (string | null)[] = [];
        let last = '';
        for (const column of IMPULSE_COLUMNS) {
            groups.push(column.group === last ? null : column.group);
            last = column.group;
        }
        const titles = IMPULSE_COLUMNS.map((c) => c.title);
        const at = (title: string, group?: string) =>
            IMPULSE_COLUMNS.findIndex((c) => c.title === title && (!group || c.group === group));
        const ticketDate = at('Дата видачі', 'Військовий квиток / Посвідчення офіцера');
        titles[ticketDate] = ' Дата видачі';
        const row = Array<string | number | null>(IMPULSE_COLUMNS.length).fill(null);
        row[0] = 'ПЕТРЕНКО';
        row[1] = 'Олег';
        row[3] = 312345678; // Excel dropped the leading zero: 0312345678
        row[4] = 'Ч';
        row[5] = 33000; // 07.05.1990
        row[ticketDate] = 45000; // 15.03.2023
        row[at('Банківська картка')] = 4149439012345678; // a card number Excel could not keep
        row[at('Телефон')] = 380501234567;
        row[at('Група крові')] = '1+';
        return [
            [null, null, 'Додаток 1'],
            groups,
            titles,
            IMPULSE_COLUMNS.map((_, i) => i + 1),
            row,
            [null, null, null],
        ];
    };

    it('reads numbers, dates written as numbers and a heading with a stray space', () => {
        const rows = template();
        const layout = detectImpulseSheet(rows)!;
        expect(layout.found).toBe(108);
        const [person] = readImpulsePersonnel(rows, layout);
        expect(person).toMatchObject({
            row: 5,
            fullName: 'ПЕТРЕНКО Олег',
            taxId: '0312345678',
            values: {
                gender: 'male',
                dateOfBirth: '07.05.1990',
                militaryTicketIssueDate: '15.03.2023',
                phoneNumber: '380501234567',
                bloodType: 'О(I)+',
            },
        });
        expect(person.values.bankCard).toBeUndefined();
    });

    it('reads «Освіта і курси» with the numbers row written as text', () => {
        const rows: SheetRows = [
            [null, null, null, null, null, 'Додаток 2'],
            [
                'ПІБ *',
                'РНОКПП',
                'Тип освіти *',
                'Рівень освіти *',
                'Форма навчання',
                'Курси професійної військової освіти',
                'Навчальний заклад *',
                'Тип навчального закладу *',
                'Спеціальність',
                'Рік початку',
                'Рік закінчення *',
                'Коментар',
            ],
            [1, 2, 3, 4, 5, 6, 7, 8, '9', '10', '11', '12'],
            [
                'Петренко Олег',
                3012345678,
                'Військова',
                'Тактичний',
                null,
                'L1A - Базовий курс',
                'НТЦ',
                'Навчально-тренувальний центр',
                null,
                null,
                2024,
                null,
            ],
        ];
        const layout = detectImpulseSheet(rows)!;
        expect(layout).toMatchObject({ kind: 'education', dataFrom: 3 });
        const [line] = readImpulseEducation(rows, layout);
        expect(line).toMatchObject({
            fullName: 'Петренко Олег',
            taxId: '3012345678',
            entry: { type: 'Військова', courses: 'L1A - Базовий курс', endYear: '2024' },
        });
        const plan = planImpulseImport(
            [],
            [line],
            [{ id: 4, fullName: 'Інший', taxId: '3012345678' } as User],
        );
        expect(plan.update[0].fields).toEqual(['educationList']);
        // The same line again adds nothing.
        const again = planImpulseImport([], [line], [plan.update[0].next]);
        expect(again.update).toEqual([]);
    });

    it('reports education of people it cannot find', () => {
        const plan = planImpulseImport(
            [],
            [{ row: 4, fullName: 'Ніхто', taxId: null, entry: { type: 'Цивільна' } }],
            [],
        );
        expect(plan.unmatched).toEqual([{ row: 4, fullName: 'Ніхто' }]);
    });

    it('creates cards for them when asked, one per person', () => {
        const line = (row: number, institution: string) => ({
            row,
            fullName: 'Новенко Іван',
            taxId: '3000000001',
            entry: { type: 'Цивільна', institution },
        });
        const plan = planImpulseImport([], [line(4, 'Школа'), line(5, 'КНУ')], [], {
            createMissing: true,
        });
        expect(plan.unmatched).toEqual([]);
        expect(plan.create).toHaveLength(1);
        expect(plan.create[0]).toMatchObject({ fullName: 'Новенко Іван', taxId: '3000000001' });
        expect(plan.create[0].educationList).toHaveLength(2);
    });
});

describe('cells', () => {
    it('dates from Excel numbers and text', () => {
        expect(cellDate(33000)).toBe('07.05.1990');
        expect(cellDate('1990-05-06')).toBe('06.05.1990');
        expect(cellDate('6.5.1990')).toBe('06.05.1990');
        expect(cellDate('вчора')).toBeNull();
    });

    it('РНОКПП only with ten digits', () => {
        expect(taxIdOf('3012345678')).toBe('3012345678');
        expect(taxIdOf(312345678)).toBe('0312345678');
        expect(taxIdOf('12345')).toBeNull();
    });
});
