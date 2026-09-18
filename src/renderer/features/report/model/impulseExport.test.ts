import ExcelJS from 'exceljs';
import { describe, expect, it, vi } from 'vitest';

import type { User } from '../../../../shared/types/user';

vi.mock('../../../shared/lib/download', () => ({ downloadFile: vi.fn() }));

import { buildImpulseWorkbook } from '../excel/generateImpulseExcel';
import {
    IMPULSE_COLUMNS,
    IMPULSE_INFO_COLUMNS,
    impulseAddress,
    impulseBloodType,
    impulseDocument,
    impulseDriverLicence,
    impulseEducationRow,
    impulseEducationRows,
    impulseGender,
    impulseOrder,
    impulsePassport,
    impulsePeople,
    impulseRank,
    impulseRow,
    impulseSummary,
    parseDate,
    splitFullName,
} from './impulseExport';

const person = (fields: Partial<User>): User =>
    ({
        id: 1,
        fullName: 'ТЕСТЕНКО Петро Іванович',
        relatives: [],
        comments: [],
        history: [],
        ...fields,
    }) as User;

const at = (title: string, group?: string) =>
    IMPULSE_COLUMNS.findIndex((c) => c.title === title && (!group || c.group === group));

const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe('the form', () => {
    it('has the 108 columns of Додаток 1 and a value for each', () => {
        expect(IMPULSE_COLUMNS).toHaveLength(108);
        expect(impulseRow(person({}))).toHaveLength(108 + IMPULSE_INFO_COLUMNS.length);
    });
});

describe('names, dates, gender, РНОКПП', () => {
    it('splits the full name', () => {
        expect(splitFullName('  КОВАЛЬ-СИДОРЕНКО  Ірина Петрівна ')).toEqual({
            last: 'КОВАЛЬ-СИДОРЕНКО',
            first: 'Ірина',
            middle: 'Петрівна',
        });
    });

    it('reads dates written in different ways, rejects impossible ones', () => {
        expect(parseDate('05.03.1990')).toEqual(day(1990, 3, 5));
        expect(parseDate('1990-03-05')).toEqual(day(1990, 3, 5));
        expect(parseDate('1990-03-05T00:00:00.000Z')).toEqual(day(1990, 3, 5));
        expect(parseDate('31.02.1990')).toBeNull();
        expect(parseDate('весна 1990')).toBeNull();
    });

    it('takes gender from the card or the patronymic', () => {
        expect(impulseGender({ gender: 'female', fullName: 'А Б Петрович' })).toBe('Ж');
        expect(impulseGender({ fullName: 'Тестенко Петро Андрійович' })).toBe('Ч');
        expect(impulseGender({ fullName: 'Тестенко Олена Андріївна' })).toBe('Ж');
        expect(impulseGender({ fullName: 'Тестенко Олена' })).toBeNull();
    });

    it('fills РНОКПП only with exactly ten digits', () => {
        const row = (taxId: string) => impulseRow(person({ taxId }))[at('РНОКПП (ІПН)')];
        expect(row('0123456789')).toBe('0123456789');
        expect(row('12345')).toBeNull();
    });
});

describe('dictionaries of Impulse', () => {
    it('ranks, with the usual abbreviations', () => {
        expect(impulseRank('Солдат')).toBe('солдат');
        expect(impulseRank('ст. солдат')).toBe('старший солдат');
        expect(impulseRank('мол.сержант')).toBe('молодший сержант');
        expect(impulseRank('ст. лейтенант')).toBe('старший лейтенант');
        expect(impulseRank('генералісимус')).toBeNull();
    });

    it('blood type', () => {
        expect(impulseBloodType('1+')).toBe('О(I)+');
        expect(impulseBloodType('0(I) Rh+')).toBe('О(I)+');
        expect(impulseBloodType('A(II) Rh-')).toBe('A(II)-');
        expect(impulseBloodType('III (-)')).toBe('B(III)-');
        expect(impulseBloodType('AB(IV) резус позитивний')).toBe('AB(IV)+');
        expect(impulseBloodType('2')).toBeNull();
    });

    it('marital status, fitness and service type', () => {
        const row = impulseRow(
            person({
                maritalStatus: 'неодружений',
                fitnessCategory: 'обмежено придатний',
                serviceType: 'мобілізований',
            }),
        );
        expect(row[at('Сімейний стан')]).toBe('Неодружений / Незаміжня');
        expect(row[at('Придатність до військової служби')]).toBe('Обмежено придатний');
        expect(row[at('Вид служби')]).toBe('За призовом під час мобілізації на особливий період');
        expect(impulseRow(person({ maritalStatus: 'одружений' }))[at('Сімейний стан')]).toBe(
            'Одружений / Заміжня',
        );
    });
});

describe('documents', () => {
    it('paper passport and ID card', () => {
        expect(impulsePassport('КН 123456 виданий Шевченківським РВ ГУ 12.03.2005')).toEqual({
            series: 'КН',
            number: '123456',
            date: day(2005, 3, 12),
            issuer: 'Шевченківським РВ ГУ',
            type: 'Паперовий',
        });
        expect(impulsePassport('ID 001234567, орган 8031, від 01.02.2020')).toEqual({
            series: null,
            number: '001234567',
            date: day(2020, 2, 1),
            issuer: '8031',
            type: 'ID - картка',
        });
        expect(impulsePassport('є').type).toBeNull();
    });

    it('military ticket', () => {
        expect(impulseDocument('АА 1234567 виданий Оболонським РТЦК 01.06.2022')).toEqual({
            series: 'АА',
            number: '1234567',
            date: day(2022, 6, 1),
            issuer: 'Оболонським РТЦК',
        });
        expect(impulseDocument('так').number).toBeNull();
    });

    it('driver licence categories in Latin letters', () => {
        expect(impulseDriverLicence('В, С')).toEqual({
            categories: 'B,C',
            series: null,
            number: null,
        });
        expect(impulseDriverLicence('ВХХ 123456 кат. В,С1')).toEqual({
            categories: 'B,C1',
            series: 'ВХХ',
            number: '123456',
        });
        expect(impulseDriverLicence('є права').categories).toBeNull();
    });

    it('orders', () => {
        expect(impulseOrder('наказ командира в/ч А0000 № 123/ос від 01.02.2024')).toEqual({
            date: day(2024, 2, 1),
            number: '123/ос',
            issuer: 'наказ командира в/ч А0000',
        });
    });

    it('puts a drill order into the drill columns', () => {
        const row = impulseRow(person({ appointmentOrder: 'стройовий наказ № 45 від 03.03.2024' }));
        const drill = 'Наказ на призначення на посаду (по стройовій частині)';
        const staff = 'Наказ на призначення на посаду (по особовому складу)';
        expect(row[at('Номер наказу', drill)]).toBe('45');
        expect(row[at('Номер наказу', staff)]).toBeNull();
    });
});

describe('addresses', () => {
    it('takes only parts with a clear mark', () => {
        expect(
            impulseAddress('Київська обл., Бучанський р-н, м. Буча, вул. Шевченка, буд. 5, кв. 12'),
        ).toEqual({
            region: 'Київська область',
            district: 'Бучанський район',
            settlement: 'Буча',
            cityDistrict: null,
            streetType: 'вулиця',
            street: 'Шевченка',
            house: '5',
            flat: '12',
        });
        expect(impulseAddress('с. Тестове, просп. Миру 10А').house).toBe('10А');
        expect(impulseAddress('десь біля річки').settlement).toBeNull();
    });
});

describe('who and what goes into the file', () => {
    it('everyone but the excluded, by name', () => {
        const users = [
            person({ id: 1, fullName: 'Яковенко Я Я' }),
            person({ id: 2, fullName: 'Андрієнко А А', shpkNumber: 'order-5' }),
            person({ id: 3, fullName: 'Борисенко Б Б', shpkNumber: 'excluded' }),
        ];
        expect(impulsePeople(users).map((u) => u.id)).toEqual([2, 1]);
    });

    it('keeps what PManager holds in the information columns', () => {
        const row = impulseRow(
            person({ passportData: 'паспорт є', rank: 'рядовий', position: 'Стрілець' }),
        );
        const info = row.slice(IMPULSE_COLUMNS.length);
        expect(info[0]).toBe('Стрілець');
        expect(info).toContain('паспорт є');
    });

    it('education row only for people with education written', () => {
        expect(impulseEducationRow(person({}))).toBeNull();
        const row = impulseEducationRow(person({ educationDetails: 'Вища, КПІ, 2012' }))!;
        expect(row[2]).toBe('Цивільна');
        expect(row[3]).toBe('Вища');
        expect(row[10]).toBe('2012');
    });

    it('summary names what is missing', () => {
        const summary = impulseSummary([
            person({
                taxId: '0123456789',
                dateOfBirth: '01.01.1990',
                rank: 'солдат',
                phoneNumber: '+380000000000',
            }),
            person({ id: 2, fullName: 'Самотній' }),
        ]);
        expect(summary.people).toBe(2);
        expect(summary.filled.taxId).toBe(1);
        expect(summary.gaps).toHaveLength(1);
        expect(summary.gaps[0].missing).toContain('name');
    });
});

describe('fields of the Impulse card', () => {
    it('are taken as they are, and win over the free text', () => {
        const row = impulseRow(
            person({
                passportData: 'КН 123456 виданий Шевченківським РВ ГУ 12.03.2005',
                passportType: 'ID - картка',
                passportNumber: '001234567',
                passportIssuer: '8031',
                passportIssueDate: '01.02.2020',
                regRegion: 'Київська область',
                regSettlement: 'Буча',
                registeredAddress: 'Львівська обл., м. Львів',
                citizenship: 'Україна',
                birthCountry: 'Нарнія',
                oathDate: '15.03.2022',
                iban: 'UA21 3223 1300 0002 6007 2335 6600 1',
                driverLicenseCategories: 'B,C1,Z',
            }),
        );
        const passport = 'Внутрішній паспорт';
        expect(row[at('Тип', passport)]).toBe('ID - картка');
        expect(row[at('Номер', passport)]).toBe('001234567');
        // The document's own fields are used alone: no series from the older text.
        expect(row[at('Серія', passport)]).toBeNull();
        expect(row[at('Дата видачі', passport)]).toEqual(day(2020, 2, 1));
        expect(row[at('Область', 'Місце реєстрації')]).toBe('Київська область');
        expect(row[at('Населений пункт', 'Місце реєстрації')]).toBe('Буча');
        expect(row[at('Громадянство')]).toBe('Україна');
        // Only values of the Impulse dictionary go into a dictionary column.
        expect(row[at('Країна народження')]).toBeNull();
        expect(row[at('Дата прийняття присяги')]).toEqual(day(2022, 3, 15));
        expect(row[at('IBAN')]).toBe('UA213223130000026007233566001');
        expect(row[at('Категорія +', 'Посвідчення водія')]).toBe('B,C1');
    });

    it('puts the orders of the card into their own columns', () => {
        const row = impulseRow(
            person({
                appointmentOrder: 'стройовий наказ № 45 від 03.03.2024',
                appointmentOrderNumber: '77/ос',
                appointmentOrderDate: '05.03.2024',
            }),
        );
        const staff = 'Наказ на призначення на посаду (по особовому складу)';
        const drill = 'Наказ на призначення на посаду (по стройовій частині)';
        expect(row[at('Номер наказу', staff)]).toBe('77/ос');
        expect(row[at('Номер наказу', drill)]).toBeNull();
    });

    it('writes one line of «Освіта і курси» per school or course', () => {
        const rows = impulseEducationRows(
            person({
                educationDetails: 'Вища, КПІ, 2012',
                educationList: [
                    {
                        id: 'e1',
                        type: 'Цивільна',
                        level: 'Вища',
                        institution: 'КПІ',
                        institutionType: 'Навчальний заклад',
                        endYear: '2012',
                    },
                    {
                        id: 'e2',
                        type: 'Військова',
                        level: 'Тактичний',
                        courses: 'L1A - Базовий курс',
                        institution: 'НАСВ',
                        endYear: '2023',
                    },
                ],
            }),
        );
        expect(rows).toHaveLength(2);
        expect(rows[0].slice(2, 4)).toEqual(['Цивільна', 'Вища']);
        expect(rows[1][3]).toBe('Тактичний');
        expect(rows[1][5]).toBe('L1A - Базовий курс');
        // Without entries the free text still gives its line.
        expect(impulseEducationRows(person({ education: 'Середня школа' }))).toHaveLength(1);
    });

    it('keeps the granted awards in the information columns', () => {
        const row = impulseRow(
            person({
                awardRecords: [
                    { id: 'a', awardId: 'order-courage', degree: 'III', status: 'awarded' },
                    { id: 'b', awardId: 'mod-iron-cross', status: 'submitted' },
                ],
            }),
        );
        expect(row[row.length - 1]).toBe('Орден «За мужність» III ступеня');
    });
});

describe('the workbook', () => {
    it('is written and read back with the form, the data and the right cell types', async () => {
        const wb = await buildImpulseWorkbook([
            person({
                taxId: '0123456789',
                dateOfBirth: '1990-03-05',
                rank: 'ст. солдат',
                phoneNumber: '0501234567',
                educationDetails: 'Професійно-технічна, ліцей, 2008',
            }),
            person({ id: 2, fullName: 'Виключений В В', shpkNumber: 'excluded' }),
        ]);
        const read = new ExcelJS.Workbook();
        await read.xlsx.load(await wb.xlsx.writeBuffer());
        expect(read.worksheets.map((w) => w.name)).toEqual([
            'Особовий склад',
            'Освіта і курси',
            'Примітки',
        ]);

        const ws = read.getWorksheet('Особовий склад')!;
        expect(ws.getCell('A3').value).toBe('Прізвище *');
        expect(ws.getCell('DD3').value).toBe('Діти(ПІБ і рік народження)');
        expect(ws.getCell('A2').value).toBe('Особиста інформація');
        expect(ws.getCell('DD4').value).toBe(108);
        expect(ws.getCell('A5').value).toBe('ТЕСТЕНКО');
        expect(ws.getCell('D5').value).toBe('0123456789');
        expect(ws.getCell('D5').numFmt).toBe('@');
        expect(ws.getCell('F5').value).toEqual(day(1990, 3, 5));
        expect(ws.getCell('F5').numFmt).toBe('dd.mm.yyyy;@');
        expect(ws.getCell(5, at('Звання') + 1).value).toBe('старший солдат');
        // The excluded person is not in the file.
        expect(ws.getCell('A6').value).toBeNull();

        const education = read.getWorksheet('Освіта і курси')!;
        expect(education.getCell('A4').value).toBe('ТЕСТЕНКО Петро Іванович');
        expect(education.getCell('D4').value).toBe('Професійно-технічна');
    });
});
