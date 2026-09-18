import type { RelativeContact, User } from '../../../../shared/types/user';

/**
 * «Імпульс» export: the personnel import form of Impulse Toolkit (Додаток 1 «Особовий склад»,
 * Додаток 2 «Освіта і курси») filled from the cards.
 *
 * Impulse finds a card by surname + first name (+ patronymic + РНОКПП) and then OVERWRITES its
 * fields with what the file holds. A wrong value would spoil a correct card there, so a column
 * is filled only when the value is recognised for sure (a date, a document number, a value of
 * Impulse's own dictionary). Everything else stays empty in the form and goes, as written in
 * PManager, into the information columns at the end, which Impulse ignores on import.
 */

export type ImpulseValue = string | Date | null;

export type ImpulseColumn = {
    /** Group heading (row 2, merged over the group). */
    group: string;
    title: string;
    width: number;
    kind?: 'date' | 'text';
};

const col = (group: string, title: string, width: number, kind?: ImpulseColumn['kind']) => ({
    group,
    title,
    width,
    kind,
});

/** Додаток 1, columns A…DD in the order of the form. */
export const IMPULSE_COLUMNS: ImpulseColumn[] = [
    col('Особиста інформація', 'Прізвище *', 16.6),
    col('Особиста інформація', "Ім'я *", 12),
    col('Особиста інформація', 'По батькові', 13.5),
    col('Особиста інформація', 'РНОКПП (ІПН)', 12.5, 'text'),
    col('Особиста інформація', 'Стать', 7.4),
    col('Особиста інформація', 'Дата народження', 11, 'date'),
    col('Особиста інформація', 'Позивний (псевдо)', 10, 'text'),
    col('Внутрішній паспорт', 'Ким виданий', 12.5),
    col('Внутрішній паспорт', 'Дата видачі', 11, 'date'),
    col('Внутрішній паспорт', 'Серія', 6.5),
    col('Внутрішній паспорт', 'Номер', 10.5, 'text'),
    col('Внутрішній паспорт', 'Тип', 10),
    col('Закордонний паспорт', 'Ким виданий', 14),
    col('Закордонний паспорт', 'Дата видачі', 11, 'date'),
    col('Закордонний паспорт', 'Серія та номер', 9),
    col('Військовий квиток / Посвідчення офіцера', 'ВОС військовослужбовця', 9),
    col('Військовий квиток / Посвідчення офіцера', 'Ким виданий', 12.5),
    col('Військовий квиток / Посвідчення офіцера', 'Дата видачі', 11, 'date'),
    col('Військовий квиток / Посвідчення офіцера', 'Серія', 7.4),
    col('Військовий квиток / Посвідчення офіцера', 'Номер', 9, 'text'),
    col('Посвідчення УБД', 'Ким виданий', 9),
    col('Посвідчення УБД', 'Дата видачі', 11, 'date'),
    col('Посвідчення УБД', 'Серія', 7.4),
    col('Посвідчення УБД', 'Номер', 9, 'text'),
    col('Фінансові дані', 'IBAN', 11.6, 'text'),
    col('Фінансові дані', 'Банківська картка', 19.9, 'text'),
    col('Фінансові дані', 'Назва банку', 9),
    col('Посвідчення водія', 'Орган що видав', 9),
    col('Посвідчення водія', 'Категорія +', 9),
    col('Посвідчення водія', 'Строк дії', 11, 'date'),
    col('Посвідчення водія', 'Дата видачі', 11, 'date'),
    col('Посвідчення водія', 'Реальний стаж водіння (років)', 9),
    col('Посвідчення водія', 'Серія', 7.4),
    col('Посвідчення водія', 'Номер', 9, 'text'),
    col('Посвідчення тракториста-машиніста', 'Орган що видав', 9),
    col('Посвідчення тракториста-машиніста', 'Категорія +', 9),
    col('Посвідчення тракториста-машиніста', 'Строк дії', 11, 'date'),
    col('Посвідчення тракториста-машиніста', 'Дата видачі', 11, 'date'),
    col('Посвідчення тракториста-машиніста', 'Реальний стаж водіння (років)', 9),
    col('Посвідчення тракториста-машиніста', 'Серія', 7.4),
    col('Посвідчення тракториста-машиніста', 'Номер', 9, 'text'),
    col('Місце реєстрації', 'Область', 11),
    col('Місце реєстрації', 'Район', 9),
    col('Місце реєстрації', 'Населений пункт', 12),
    col('Місце реєстрації', 'Район населеного пункту', 9),
    col('Місце реєстрації', 'Тип вулиці', 8),
    col('Місце реєстрації', 'Вулиця', 12),
    col('Місце реєстрації', '№ будинку', 7.4, 'text'),
    col('Місце реєстрації', '№ квартири', 7.4, 'text'),
    col('Місце проживання', 'Область', 11, 'text'),
    col('Місце проживання', 'Район', 9, 'text'),
    col('Місце проживання', 'Населений пункт', 12, 'text'),
    col('Місце проживання', 'Район населеного пункту', 9, 'text'),
    col('Місце проживання', 'Тип вулиці', 8, 'text'),
    col('Місце проживання', 'Вулиця', 12, 'text'),
    col('Місце проживання', '№ будинку', 7.4, 'text'),
    col('Місце проживання', '№ квартири', 7.4, 'text'),
    col('Контактні дані', 'Телефон', 13, 'text'),
    col('Контактні дані', 'Додатковий телефон', 11, 'text'),
    col('Контактні дані', 'Email', 12, 'text'),
    col('Наказ на присвоєння звання', 'Звання', 12),
    col('Наказ на присвоєння звання', 'Дата наказу', 11, 'date'),
    col('Наказ на присвоєння звання', 'Номер наказу', 9),
    col('Наказ на присвоєння звання', 'Ким виданий', 11),
    col('Наказ на призначення на посаду (по особовому складу)', 'Дата наказу', 11, 'date'),
    col('Наказ на призначення на посаду (по особовому складу)', 'Номер наказу', 9),
    col('Наказ на призначення на посаду (по особовому складу)', 'Ким виданий', 12),
    col('Наказ на призначення на посаду (по стройовій частині)', 'Дата наказу', 11, 'date'),
    col('Наказ на призначення на посаду (по стройовій частині)', 'Номер наказу', 9),
    col('Наказ на призначення на посаду (по стройовій частині)', 'Ким виданий', 12),
    col('Базова загальновійськова підготовка', 'Дата проходження, з', 11, 'date'),
    col('Базова загальновійськова підготовка', 'Дата проходження, по', 11, 'date'),
    col('Базова загальновійськова підготовка', 'Місце проходження (умовне найменування в/ч)', 12),
    col('Базова загальновійськова підготовка', 'Командир в/ч', 9),
    col('Базова загальновійськова підготовка', 'Коментар', 9),
    col('Персональна інформація', 'Громадянство', 11),
    col('Персональна інформація', 'Країна народження', 9),
    col('Персональна інформація', 'Місце народження', 12),
    col('Персональна інформація', 'Сімейний стан', 12),
    col('Персональна інформація', 'Національність', 9),
    col('Персональна інформація', 'Віросповідання', 9),
    col('Персональна інформація', 'Теги +', 9),
    col('Дані про вчене звання', 'Вчене звання', 9),
    col('Дані про вчене звання', 'Ким присвоєно', 9),
    col('Дані про вчене звання', 'Дата присвоєння', 11, 'date'),
    col('Дані про вчене звання', 'Наукові праці та винаходи', 9),
    col('Дані про обрання до виборчих органів', 'Назва виборчого органу', 9),
    col('Дані про обрання до виборчих органів', 'Дата обрання', 11, 'date'),
    col('Дані про обрання до виборчих органів', 'Дата закінчення повноважень', 11, 'date'),
    col('Дані про обрання до виборчих органів', 'Виборча посада', 9),
    col('Медична інформація', 'Група крові', 9),
    col('Проходження служби', 'Придатність до військової служби', 13),
    col('Проходження служби', 'Дата прийняття присяги', 11, 'date'),
    col('Проходження служби', 'Періоди служби', 14),
    col('Проходження служби', 'Вид служби', 14),
    col('Проходження служби', 'Дата призову', 11, 'date'),
    col('Проходження служби', 'Дата наказу на зарахування', 11, 'date'),
    col('Проходження служби', 'Номер наказу', 9),
    col('Проходження служби', 'ТЦК та СП (призов)', 14),
    col('Проходження служби', 'ТЦК та СП (облік)', 12),
    col('Вислуга', 'Вислуга на дату', 11, 'date'),
    col('Вислуга', 'Вислуга РР-ММ-ДД', 9),
    col('Вислуга', 'Пільгова вислуга на дату', 11, 'date'),
    col('Вислуга', 'Пільгова вислуга РР-ММ-ДД', 9),
    col('Додатково', 'Коментар', 12),
    col("Склад сім'ї", 'ПІБ(Батьки), місце проживання, телефон', 24),
    col("Склад сім'ї", 'ПІБ(Дружина або Чоловік)', 18),
    col("Склад сім'ї", 'Діти(ПІБ і рік народження)', 18),
];

/** After the form: what PManager holds, as written there. Impulse ignores these on import. */
export const IMPULSE_INFO_GROUP = 'Інформаційні колонки PManager (не імпортуються)';
export const IMPULSE_INFO_COLUMNS: ImpulseColumn[] = [
    col(IMPULSE_INFO_GROUP, 'Посада', 22),
    col(IMPULSE_INFO_GROUP, 'Підрозділ', 16),
    col(IMPULSE_INFO_GROUP, '№ по штату', 9, 'text'),
    col(IMPULSE_INFO_GROUP, 'Статус', 16),
    col(IMPULSE_INFO_GROUP, 'Прикомандирований', 12),
    col(IMPULSE_INFO_GROUP, 'Звання (як у PManager)', 14),
    col(IMPULSE_INFO_GROUP, 'Паспорт (як у PManager)', 24),
    col(IMPULSE_INFO_GROUP, 'Військовий квиток (як у PManager)', 24),
    col(IMPULSE_INFO_GROUP, 'Посвідчення УБД (як у PManager)', 20),
    col(IMPULSE_INFO_GROUP, 'Водійські права (як у PManager)', 18),
    col(IMPULSE_INFO_GROUP, 'Адреса реєстрації (як у PManager)', 30),
    col(IMPULSE_INFO_GROUP, 'Адреса проживання (як у PManager)', 30),
    col(IMPULSE_INFO_GROUP, 'Звання присвоєно (як у PManager)', 20),
    col(IMPULSE_INFO_GROUP, 'Наказ про призначення (як у PManager)', 24),
    col(IMPULSE_INFO_GROUP, 'Призовні дані (як у PManager)', 20),
    col(IMPULSE_INFO_GROUP, 'БЗВП (як у PManager)', 14),
    col(IMPULSE_INFO_GROUP, 'Родина (як у PManager)', 24),
];

/** Додаток 2 «Освіта і курси». */
export const IMPULSE_EDUCATION_COLUMNS: ImpulseColumn[] = [
    col('', 'ПІБ *', 30),
    col('', 'РНОКПП', 12, 'text'),
    col('', 'Тип освіти *', 11),
    col('', 'Рівень освіти *', 16),
    col('', 'Форма навчання', 12),
    col('', 'Курси професійної військової освіти', 14),
    col('', 'Навчальний заклад *', 36),
    col('', 'Тип навчального закладу *', 16),
    col('', 'Спеціальність', 20),
    col('', 'Рік початку', 8),
    col('', 'Рік закінчення *', 9),
    col('', 'Коментар', 36),
];

// ---------------------------------------------------------------- Impulse dictionaries

export const IMPULSE_RANKS = [
    'рекрут',
    'працівник ЗСУ',
    'матрос',
    'солдат',
    'рядовий',
    'старший матрос',
    'старший солдат',
    'старшина 2 статті',
    'молодший сержант',
    'старшина 1 статті',
    'сержант',
    'головний старшина',
    'старший сержант',
    'старшина',
    'головний корабельний старшина',
    'головний сержант',
    'прапорщик',
    'мічман',
    'штаб-старшина',
    'штаб-сержант',
    'майстер-старшина',
    'старший мічман',
    'старший прапорщик',
    'майстер-сержант',
    'старший майстер-старшина',
    'старший майстер-сержант',
    'головний майстер-старшина',
    'головний майстер-сержант',
    'молодший лейтенант медичної служби',
    'молодший лейтенант капеланської служби',
    'молодший лейтенант юстиції',
    'молодший лейтенант',
    'лейтенант медичної служби',
    'лейтенант капеланської служби',
    'лейтенант юстиції',
    'лейтенант',
    'старший лейтенант юстиції',
    'старший лейтенант медичної служби',
    'старший лейтенант капеланської служби',
    'старший лейтенант',
    'капітан юстиції',
    'капітан медичної служби',
    'капітан капеланської служби',
    'капітан-лейтенант',
    'капітан',
    'майор юстиції',
    'майор медичної служби',
    'майор капеланської служби',
    'капітан 3 рангу',
    'майор',
    'підполковник юстиції',
    'підполковник медичної служби',
    'підполковник капеланської служби',
    'капітан 2 рангу',
    'підполковник',
    'полковник юстиції',
    'полковник медичної служби',
    'полковник капеланської служби',
    'капітан 1 рангу',
    'полковник',
    'бригадний генерал',
    'коммодор',
    'бригадний генерал юстиції',
    'бригадний генерал медичної служби',
    'генерал-майор',
    'генерал-майор медичної служби',
    'генерал-майор юстиції',
    'контр-адмірал',
    'генерал-лейтенант',
    'віце-адмірал',
    'генерал',
    'адмірал',
];

const BLOOD_GROUPS = ['О(I)', 'A(II)', 'B(III)', 'AB(IV)'];

const MARITAL: [RegExp, string][] = [
    [/неодруж|незаміж|холост/i, 'Неодружений / Незаміжня'],
    [/цивільн/i, 'В цивільному шлюбі'],
    [/розлуч/i, 'Розлучений / Розлучена'],
    [/вдів|вдова/i, 'Вдівець / Вдова'],
    [/одруж|заміж/i, 'Одружений / Заміжня'],
];

const FITNESS: [RegExp, string][] = [
    [/тимчасово/i, 'Тимчасово непридатний'],
    [/обмежено/i, 'Обмежено придатний'],
    [/забезпеч/i, 'Придатний до підрозділів забезпечення'],
    [/не\s*придат/i, 'Не придатний'],
    [/не\s*проход/i, 'Не проходив ВЛК'],
    [/придат/i, 'Придатний'],
];

const SERVICE_TYPES: [RegExp, string][] = [
    [/резерв/i, 'За призовом осіб із числа резервістів в особливий період'],
    [/офіцер/i, 'За призовом осіб офіцерського складу'],
    [/мобіл|призов/i, 'За призовом під час мобілізації на особливий період'],
    [/контракт/i, 'За контрактом'],
    [/строков/i, 'Строкова військова служба'],
];

// ---------------------------------------------------------------- helpers

const clean = (value: unknown): string =>
    typeof value === 'string'
        ? value.replace(/\s+/g, ' ').trim()
        : value == null
          ? ''
          : String(value).trim();

const orNull = (value: string | null | undefined): string | null => {
    const text = clean(value);
    return text ? text : null;
};

const firstMatch = (text: string, table: [RegExp, string][]): string | null =>
    table.find(([pattern]) => pattern.test(text))?.[1] ?? null;

/** A calendar date from "12.03.2005", "12/03/2005", "2005-03-12" or an ISO time stamp. */
export function parseDate(value: unknown): Date | null {
    const text = clean(value);
    if (!text) return null;
    let d: number, m: number, y: number;
    const dotted = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text);
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(text);
    if (dotted) [d, m, y] = [Number(dotted[1]), Number(dotted[2]), Number(dotted[3])];
    else if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    else return null;
    const date = new Date(Date.UTC(y, m - 1, d));
    const valid =
        date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
    return valid && y > 1900 && y < 2100 ? date : null;
}

/** The first date written inside a text ("… від 12.03.2005 …"). */
function dateIn(text: string): Date | null {
    const match = /\b(\d{1,2}\.\d{1,2}\.\d{4})\b/.exec(text);
    return match ? parseDate(match[1]) : null;
}

/** "Прізвище Ім'я По батькові": the first word is the surname, the second the name. */
export function splitFullName(fullName: string): { last: string; first: string; middle: string } {
    const parts = clean(fullName).split(' ').filter(Boolean);
    return { last: parts[0] ?? '', first: parts[1] ?? '', middle: parts.slice(2).join(' ') };
}

export function impulseGender(user: Pick<User, 'gender' | 'fullName'>): string | null {
    if (user.gender === 'male') return 'Ч';
    if (user.gender === 'female') return 'Ж';
    const middle = splitFullName(user.fullName).middle.toLowerCase();
    if (/(ович|евич|йович)$/.test(middle)) return 'Ч';
    if (/(івна|ївна|овна|евна)$/.test(middle)) return 'Ж';
    return null;
}

/** РНОКПП: exactly 10 digits. */
export function impulseTaxId(user: Pick<User, 'taxId' | 'identificationNumber'>): string | null {
    for (const candidate of [user.taxId, user.identificationNumber]) {
        const digits = clean(candidate).replace(/\s/g, '');
        if (/^\d{10}$/.test(digits)) return digits;
    }
    return null;
}

// \b does not see Cyrillic letters: word edges are spelled out.
const RANK_WORDS: [RegExp, string][] = [
    [/(^|\s)ст\.\s*/g, '$1старший '],
    [/(^|\s)мол\.\s*/g, '$1молодший '],
    [/(^|\s)гол\.\s*/g, '$1головний '],
    [/(^|\s)серж\.?(?=\s|$)/g, '$1сержант'],
    [/(^|\s)лейт\.?(?=\s|$)/g, '$1лейтенант'],
    [/(^|\s)солд\.?(?=\s|$)/g, '$1солдат'],
];

/** A rank of Impulse's dictionary ("ст. солдат" → "старший солдат"), or null. */
export function impulseRank(rank: unknown): string | null {
    let text = clean(rank).toLowerCase();
    if (!text) return null;
    for (const [pattern, full] of RANK_WORDS) text = text.replace(pattern, full);
    text = text.replace(/\s+/g, ' ').trim();
    return IMPULSE_RANKS.find((known) => known.toLowerCase() === text) ?? null;
}

/** "О(I)+" … "AB(IV)-" from "1+", "I (+)", "0(I) Rh+", "A(II) резус негативний"… */
export function impulseBloodType(value: unknown): string | null {
    const upper = clean(value).toUpperCase();
    if (!upper) return null;
    // The Rh sign first: words like «позитивний» must be read before letters are converted.
    const negative = /-|−|НЕГАТ|NEG/.test(upper);
    const positive = /\+|ПОЗИТ|POS/.test(upper);
    if (negative === positive) return null;
    const text = upper.replace(/[АВО]/g, (c) => ({ А: 'A', В: 'B', О: 'O' })[c] ?? c);
    let group: number | null = null;
    const roman = /\b(IV|III|II|I)\b|\((IV|III|II|I)\)/.exec(text);
    if (roman) group = ['I', 'II', 'III', 'IV'].indexOf(roman[1] ?? roman[2]);
    else if (/^\s*([1-4])/.test(text)) group = Number(/^\s*([1-4])/.exec(text)![1]) - 1;
    else if (/^\s*AB/.test(text)) group = 3;
    else if (/^\s*(O|0)/.test(text)) group = 0;
    else if (/^\s*A/.test(text)) group = 1;
    else if (/^\s*B/.test(text)) group = 2;
    if (group === null || group < 0) return null;
    return `${BLOOD_GROUPS[group]}${positive ? '+' : '-'}`;
}

type Document = {
    series: string | null;
    number: string | null;
    date: Date | null;
    issuer: string | null;
};

const LETTERS = 'А-ЯІЇЄҐA-Z';

/** Issuer after "виданий"/"видав"/"орган" up to a date or the end. */
function issuerIn(text: string): string | null {
    const match =
        /(?:видан\S*|видав|орган\S*)\s*:?\s*(.+?)(?=,?\s*(?:від\s*)?\d{1,2}\.\d{1,2}\.\d{4}|$)/i.exec(
            text,
        );
    const issuer = match ? match[1].replace(/[,;.\s]+$/, '').trim() : '';
    return issuer.length >= 3 ? issuer : null;
}

/** Series of 2–3 capital letters and a number of 6–7 digits ("АА 123456", "АА№1234567"). */
function seriesAndNumber(text: string, series = '2,3'): { series: string; number: string } | null {
    const match = new RegExp(
        `(?:^|[^${LETTERS}])([${LETTERS}]{${series}})\\s*№?\\s*(\\d{6,7})(?!\\d)`,
    ).exec(text.toUpperCase());
    return match ? { series: match[1], number: match[2] } : null;
}

export type Passport = Document & { type: 'Паперовий' | 'ID - картка' | null };

/** Internal passport: paper "КН 123456" or an ID card of 9 digits. */
export function impulsePassport(value: unknown): Passport {
    const text = clean(value);
    const empty: Passport = { series: null, number: null, date: null, issuer: null, type: null };
    if (!text) return empty;
    const paper = seriesAndNumber(text, '2');
    const card = /(?<!\d)(\d{9})(?!\d)/.exec(text);
    const date = dateIn(text);
    if (paper) return { ...paper, date, issuer: issuerIn(text), type: 'Паперовий' };
    if (card) {
        const authority = /(?:орган\S*|видав\S*|видан\S*)\D{0,12}(\d{4})(?!\d)/i.exec(text);
        return {
            series: null,
            number: card[1],
            date,
            issuer: authority ? authority[1] : null,
            type: 'ID - картка',
        };
    }
    return empty;
}

/** Military ticket, officer's certificate or УБД certificate: series + number, date, issuer. */
export function impulseDocument(value: unknown): Document {
    const text = clean(value);
    const found = text ? seriesAndNumber(text) : null;
    if (!found) return { series: null, number: null, date: null, issuer: null };
    return { ...found, date: dateIn(text), issuer: issuerIn(text) };
}

const DRIVER_CATEGORIES = [
    'C1E',
    'D1E',
    'BE',
    'CE',
    'DE',
    'A1',
    'B1',
    'C1',
    'D1',
    'A',
    'B',
    'C',
    'D',
    'T',
];

/** Driver licence categories ("B, C" / "кат. В,С") and the licence series + number. */
export function impulseDriverLicence(value: unknown): {
    categories: string | null;
    series: string | null;
    number: string | null;
} {
    const text = clean(value);
    if (!text) return { categories: null, series: null, number: null };
    const doc = /([А-ЯІЇЄҐA-Z]{3})\s*№?\s*(\d{6})(?!\d)/.exec(text.toUpperCase());
    const rest = (doc ? text.toUpperCase().replace(doc[0], ' ') : text.toUpperCase()).trim();
    // "кат. B, C" or nothing but categories.
    const labelled = /КАТ[А-ЯІЇЄҐ.]*\s*:?\s*(.+)$/.exec(rest);
    // Categories are Latin letters in Impulse; people type Cyrillic look-alikes.
    const latin = (labelled ? labelled[1] : rest).replace(
        /[АВСЕТ]/g,
        (c) => ({ А: 'A', В: 'B', С: 'C', Е: 'E', Т: 'T' })[c] ?? c,
    );
    const source = labelled || /^[A-Z0-9 ,;]+$/.test(latin) ? latin : null;
    const categories = source
        ? source
              .split(/[\s,;.]+/)
              .filter((token) => DRIVER_CATEGORIES.includes(token))
              .filter((token, index, all) => all.indexOf(token) === index)
        : [];
    return {
        categories: categories.length ? categories.join(',') : null,
        series: doc ? doc[1] : null,
        number: doc ? doc[2] : null,
    };
}

export type Address = {
    region: string | null;
    district: string | null;
    settlement: string | null;
    cityDistrict: string | null;
    streetType: string | null;
    street: string | null;
    house: string | null;
    flat: string | null;
};

const STREET_TYPES: [RegExp, string][] = [
    [/^(вул\.?|вулиця)\s*/i, 'вулиця'],
    [/^(просп\.?|пр-т|проспект)\s*/i, 'проспект'],
    [/^(пров\.?|провулок)\s*/i, 'провулок'],
    [/^(бульв\.?|б-р|бульвар)\s*/i, 'бульвар'],
    [/^(пл\.|площа)\s*/i, 'площа'],
    [/^(узвіз)\s*/i, 'узвіз'],
    [/^(тупик)\s*/i, 'тупик'],
    [/^(шосе)\s*/i, 'шосе'],
    [/^(набережна)\s*/i, 'набережна'],
];

/**
 * "Київська обл., Бучанський р-н, м. Буча, вул. Шевченка, буд. 5, кв. 12" → parts. Only parts
 * with a clear mark (обл., р-н, м./с./смт, вул., буд., кв.) are taken.
 */
export function impulseAddress(value: unknown): Address {
    const result: Address = {
        region: null,
        district: null,
        settlement: null,
        cityDistrict: null,
        streetType: null,
        street: null,
        house: null,
        flat: null,
    };
    const text = clean(value);
    if (!text) return result;
    const parts = text
        .split(/[,;]/)
        .map((p) => p.trim())
        .filter(Boolean);
    for (const part of parts) {
        let match: RegExpExecArray | null;
        if (!result.region && (match = /^(.+?)\s+(обл\.?|область)$/i.exec(part))) {
            result.region = `${match[1]} область`;
        } else if (/^(м\.|місто)\s*київ$/i.test(part) && !result.region) {
            result.region = 'Київ';
            result.settlement = 'Київ';
        } else if ((match = /^(.+?)\s+(р-н|район)$/i.exec(part))) {
            if (result.settlement) result.cityDistrict ??= `${match[1]} район`;
            else result.district ??= `${match[1]} район`;
        } else if (
            !result.settlement &&
            (match = /^(м\.|місто|с\.|село|смт\.?|сел\.|селище)\s*(.+)$/i.exec(part))
        ) {
            result.settlement = match[2].trim();
        } else if (!result.street && STREET_TYPES.some(([pattern]) => pattern.test(part))) {
            const [pattern, type] = STREET_TYPES.find(([p]) => p.test(part))!;
            const rest = part.replace(pattern, '');
            const withHouse = /^(.+?)\s+(\d+[\p{L}]?(?:\/\d+)?)$/u.exec(rest);
            result.streetType = type;
            result.street = withHouse ? withHouse[1] : rest;
            if (withHouse) result.house ??= withHouse[2];
        } else if ((match = /^(буд\.?|будинок|б\.)\s*(.+)$/i.exec(part))) {
            result.house = match[2].trim();
        } else if ((match = /^(кв\.?|квартира)\s*(.+)$/i.exec(part))) {
            result.flat = match[2].trim();
        }
    }
    return result;
}

/** Order text "наказ командира в/ч А0000 № 123 від 01.02.2024" → date, number, issuer. */
export function impulseOrder(value: unknown): {
    date: Date | null;
    number: string | null;
    issuer: string | null;
} {
    const text = clean(value);
    if (!text) return { date: null, number: null, issuer: null };
    const number = /№\s*([\p{L}\d\-/]*\d[\p{L}\d\-/]*)/u.exec(text);
    const issuer = text
        .replace(/№\s*[\p{L}\d\-/]*\d[\p{L}\d\-/]*/u, ' ')
        .replace(/(від\s*)?\d{1,2}\.\d{1,2}\.\d{4}\s*(р\.?|року)?/, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[\s,;.]+|[\s,;]+$/g, '')
        .trim();
    return {
        date: dateIn(text),
        number: number ? number[1].replace(/[-/]+$/, '') : null,
        issuer: issuer.length >= 3 ? issuer : null,
    };
}

function relativeLine(relative: RelativeContact): string {
    return [relative.name, relative.notes, relative.phone].map(clean).filter(Boolean).join(', ');
}

function family(user: User): {
    parents: string | null;
    spouse: string | null;
    children: string | null;
} {
    const relatives = Array.isArray(user.relatives) ? user.relatives : [];
    const of = (pattern: RegExp) =>
        relatives
            .filter((r) => pattern.test(clean(r.relationship)))
            .map(relativeLine)
            .filter(Boolean)
            .join('; ');
    const children = clean(user.childrenInfo) || of(/син|доч|донь|дитин/i);
    return {
        parents: orNull(of(/мат|бат|мам|тат|бать/i)),
        spouse: orNull(of(/дружин|чолов/i)),
        children: orNull(children),
    };
}

// ---------------------------------------------------------------- rows

/** One row of Додаток 1 plus the information columns, in column order. */
export function impulseRow(user: User, context: { unit?: string | null } = {}): ImpulseValue[] {
    const name = splitFullName(user.fullName);
    const passport = impulsePassport(user.passportData);
    const ticket = impulseDocument(user.militaryTicketInfo);
    const ubd = impulseDocument(user.participantNumber || user.ubdStatus);
    const driver = impulseDriverLicence(user.driverLicenses);
    const registered = impulseAddress(user.registeredAddress);
    const living = impulseAddress(user.residenceAddress);
    const rankOrder = impulseOrder(user.rankAssignedBy);
    const appointment = impulseOrder(user.appointmentOrder);
    const drill = /стройов|по\s*с\/ч|\bс\/ч\b/i.test(clean(user.appointmentOrder));
    const relatives = family(user);
    const phone = orNull(user.phoneNumber);
    const serviceType = firstMatch(clean(user.serviceType), SERVICE_TYPES);
    const recruitedBy = orNull(user.recruitmentOfficeDetails) ?? orNull(user.recruitingOffice);

    const form: ImpulseValue[] = [
        orNull(name.last),
        orNull(name.first),
        orNull(name.middle),
        impulseTaxId(user),
        impulseGender(user),
        parseDate(user.dateOfBirth),
        orNull(user.callsign),
        // Внутрішній паспорт
        passport.issuer,
        passport.date,
        passport.series,
        passport.number,
        passport.type,
        // Закордонний паспорт
        null,
        null,
        null,
        // Військовий квиток
        orNull(user.vosCode),
        ticket.issuer,
        ticket.date,
        ticket.series,
        ticket.number,
        // УБД
        ubd.issuer,
        ubd.date,
        ubd.series,
        ubd.number,
        // Фінансові дані
        null,
        null,
        null,
        // Посвідчення водія
        null,
        driver.categories,
        null,
        null,
        null,
        driver.series,
        driver.number,
        // Посвідчення тракториста-машиніста
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        // Місце реєстрації
        registered.region,
        registered.district,
        registered.settlement,
        registered.cityDistrict,
        registered.streetType,
        registered.street,
        registered.house,
        registered.flat,
        // Місце проживання
        living.region,
        living.district,
        living.settlement,
        living.cityDistrict,
        living.streetType,
        living.street,
        living.house,
        living.flat,
        // Контактні дані
        phone,
        null,
        orNull(user.email),
        // Наказ на присвоєння звання
        impulseRank(user.rank),
        parseDate(user.rankAssignmentDate) ?? rankOrder.date,
        rankOrder.number,
        rankOrder.issuer,
        // Наказ на призначення (по особовому складу)
        drill ? null : appointment.date,
        drill ? null : appointment.number,
        drill ? null : appointment.issuer,
        // Наказ на призначення (по стройовій частині)
        drill ? appointment.date : null,
        drill ? appointment.number : null,
        drill ? appointment.issuer : null,
        // БЗВП
        null,
        null,
        null,
        null,
        null,
        // Персональна інформація
        null,
        null,
        orNull(user.placeOfBirth),
        firstMatch(clean(user.maritalStatus), MARITAL),
        null,
        orNull(user.religion),
        null,
        // Вчене звання
        null,
        null,
        null,
        null,
        // Виборчі органи
        null,
        null,
        null,
        null,
        // Медична інформація
        impulseBloodType(user.bloodType),
        // Проходження служби
        firstMatch(clean(user.fitnessCategory), FITNESS),
        null,
        orNull(user.militaryServiceHistory),
        serviceType,
        null,
        null,
        null,
        recruitedBy,
        null,
        // Вислуга
        null,
        null,
        null,
        null,
        // Додатково
        null,
        // Склад сім'ї
        relatives.parents,
        relatives.spouse,
        relatives.children,
    ];

    const info: ImpulseValue[] = [
        orNull(user.position),
        orNull(context.unit ?? user.unitMain),
        orNull(user.shpkNumber),
        orNull(user.soldierStatus),
        user.isAttached ? `так${user.attachedFrom ? ` (${clean(user.attachedFrom)})` : ''}` : null,
        orNull(user.rank),
        orNull(user.passportData),
        orNull(user.militaryTicketInfo),
        orNull(user.participantNumber) ?? orNull(user.ubdStatus),
        orNull(user.driverLicenses),
        orNull(user.registeredAddress),
        orNull(user.residenceAddress),
        orNull(user.rankAssignedBy),
        orNull(user.appointmentOrder),
        orNull(user.conscriptionInfo),
        orNull(user.bzvpStatus),
        orNull(user.familyInfo),
    ];
    return [...form, ...info];
}

const EDUCATION_LEVELS: [RegExp, string][] = [
    [/неповн\S*\s+вищ|бакалавр\s+молодш|молодш\S*\s+спеціаліст/i, 'Неповна вища'],
    [/вищ|магістр|спеціаліст|університет|академі|інститут/i, 'Вища'],
    [/профес|пту|ліце|технікум|коледж|училищ/i, 'Професійно-технічна'],
    [/середн|школ|загальн/i, 'Середня загальна'],
];

/** A row of Додаток 2 for a person whose card has education, or null. */
export function impulseEducationRow(user: User): ImpulseValue[] | null {
    const text = clean(user.educationDetails) || clean(user.education);
    if (!text) return null;
    const years = [...text.matchAll(/\b(19[5-9]\d|20[0-4]\d)\b/g)].map((m) => m[1]);
    return [
        clean(user.fullName),
        impulseTaxId(user),
        /військов/i.test(text) ? 'Військова' : 'Цивільна',
        firstMatch(text, EDUCATION_LEVELS),
        null,
        null,
        null,
        null,
        null,
        null,
        years.length ? years[years.length - 1] : null,
        text,
    ];
}

/** Everyone who serves in the unit: the list and the ones handed over by an order, not excluded. */
export function impulsePeople(users: User[]): User[] {
    return users
        .filter((user) => String(user.shpkNumber ?? '') !== 'excluded')
        .filter((user) => clean(user.fullName))
        .sort((a, b) => clean(a.fullName).localeCompare(clean(b.fullName), 'uk'));
}

/** The fields a person needs so Impulse finds the card and takes the main data. */
const columnOf = (title: string) => IMPULSE_COLUMNS.findIndex((c) => c.title === title);

export const IMPULSE_CHECKS = [
    { key: 'name', label: "Прізвище та ім'я", column: columnOf("Ім'я *") },
    { key: 'taxId', label: 'РНОКПП (10 цифр)', column: columnOf('РНОКПП (ІПН)') },
    { key: 'birth', label: 'Дата народження', column: columnOf('Дата народження') },
    { key: 'gender', label: 'Стать', column: columnOf('Стать') },
    { key: 'rank', label: 'Звання з довідника Імпульсу', column: columnOf('Звання') },
    { key: 'phone', label: 'Телефон', column: columnOf('Телефон') },
] as const;

export type ImpulseCheckKey = (typeof IMPULSE_CHECKS)[number]['key'];

export type ImpulseSummary = {
    people: number;
    filled: Record<ImpulseCheckKey, number>;
    /** People with something missing, with what is missing. */
    gaps: { user: User; missing: ImpulseCheckKey[] }[];
};

export function impulseSummary(users: User[]): ImpulseSummary {
    const people = impulsePeople(users);
    const filled = Object.fromEntries(IMPULSE_CHECKS.map((c) => [c.key, 0])) as Record<
        ImpulseCheckKey,
        number
    >;
    const gaps: ImpulseSummary['gaps'] = [];
    for (const user of people) {
        const row = impulseRow(user);
        const missing = IMPULSE_CHECKS.filter((check) => {
            const ok =
                check.key === 'name'
                    ? row[0] !== null && row[1] !== null
                    : row[check.column] !== null;
            if (ok) filled[check.key]++;
            return !ok;
        }).map((check) => check.key);
        if (missing.length) gaps.push({ user, missing });
    }
    return { people: people.length, filled, gaps };
}
