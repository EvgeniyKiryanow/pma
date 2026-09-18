import type { User } from '../types/user';
import {
    IMPULSE_BLOOD_TYPES,
    IMPULSE_DRIVER_CATEGORIES,
    IMPULSE_FITNESS,
    IMPULSE_MARITAL_STATUSES,
    IMPULSE_RANKS,
    IMPULSE_SERVICE_TYPES,
} from './impulseDictionaries';

/**
 * Reading free text of older cards (Excel columns such as «Паспорт», «Військовий квиток»,
 * «Адреса прописки») into the fields of the Impulse card. A value is returned only when it is
 * recognised for sure — a date, a document number, a value of an Impulse dictionary — so a
 * guess never ends up in a field that is exported as a fact.
 */

export const clean = (value: unknown): string =>
    typeof value === 'string'
        ? value.replace(/\s+/g, ' ').trim()
        : value == null
          ? ''
          : String(value).trim();

export const orNull = (value: string | null | undefined): string | null => {
    const text = clean(value);
    return text ? text : null;
};

export const firstMatch = (text: string, table: [RegExp, string][]): string | null =>
    table.find(([pattern]) => pattern.test(text))?.[1] ?? null;

const [MARRIED, CIVIL_MARRIAGE, SINGLE, WIDOWED, DIVORCED] = IMPULSE_MARITAL_STATUSES;

export const MARITAL: [RegExp, string][] = [
    [/неодруж|незаміж|холост/i, SINGLE],
    [/цивільн/i, CIVIL_MARRIAGE],
    [/розлуч/i, DIVORCED],
    [/вдів|вдова/i, WIDOWED],
    [/одруж|заміж/i, MARRIED],
];

const [FIT, LIMITED, UNFIT, FIT_SUPPORT, NO_VLK, TEMP_UNFIT] = IMPULSE_FITNESS;

export const FITNESS: [RegExp, string][] = [
    [/тимчасово/i, TEMP_UNFIT],
    [/обмежено/i, LIMITED],
    [/забезпеч/i, FIT_SUPPORT],
    [/не\s*придат/i, UNFIT],
    [/не\s*проход/i, NO_VLK],
    [/придат/i, FIT],
];

const [MOBILISED, CONTRACT, CONSCRIPT, RESERVIST, OFFICER] = IMPULSE_SERVICE_TYPES;

export const SERVICE_TYPES: [RegExp, string][] = [
    [/резерв/i, RESERVIST],
    [/офіцер/i, OFFICER],
    [/мобіл|призов/i, MOBILISED],
    [/контракт/i, CONTRACT],
    [/строков/i, CONSCRIPT],
];

/** A value of an Impulse dictionary written exactly (case aside), or a recognised synonym. */
export function dictionaryValue(
    value: unknown,
    dictionary: readonly string[],
    synonyms: [RegExp, string][] = [],
): string | null {
    const text = clean(value);
    if (!text) return null;
    const exact = dictionary.find((item) => item.toLowerCase() === text.toLowerCase());
    return exact ?? firstMatch(text, synonyms);
}

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

/** "ДД.ММ.РРРР" of a date parsed by `parseDate`. */
export function formatDate(date: Date | null): string | null {
    if (!date) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;
}

/** The first date written inside a text ("… від 12.03.2005 …"). */
export function dateIn(text: string): Date | null {
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

const BLOOD_GROUPS = ['О(I)', 'A(II)', 'B(III)', 'AB(IV)'];

/** "О(I)+" … "AB(IV)-" from "1+", "I (+)", "0(I) Rh+", "A(II) резус негативний"… */
export function impulseBloodType(value: unknown): string | null {
    const text0 = clean(value);
    if (!text0) return null;
    if ((IMPULSE_BLOOD_TYPES as readonly string[]).includes(text0)) return text0;
    const upper = text0.toUpperCase();
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

export type RecognizedDocument = {
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

export type Passport = RecognizedDocument & { type: 'Паперовий' | 'ID - картка' | null };

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
export function impulseDocument(value: unknown): RecognizedDocument {
    const text = clean(value);
    const found = text ? seriesAndNumber(text) : null;
    if (!found) return { series: null, number: null, date: null, issuer: null };
    return { ...found, date: dateIn(text), issuer: issuerIn(text) };
}

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
    const known = IMPULSE_DRIVER_CATEGORIES as readonly string[];
    const categories = source
        ? source
              .split(/[\s,;.]+/)
              .filter((token) => known.includes(token))
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

/** Is the appointment order a daily order of the unit (по стройовій частині)? */
export const isDrillOrder = (text: unknown): boolean =>
    /стройов|по\s*с\/ч|\bс\/ч\b/i.test(clean(text));

type Fields = Partial<Record<keyof User, string>>;

const put = (target: Fields, key: keyof User, value: string | Date | null) => {
    if (value === null || value === '') return;
    target[key] = value instanceof Date ? (formatDate(value) ?? undefined) : value;
};

/**
 * What the free text of a card section says, as values of its Impulse fields. Only fields
 * recognised for sure are in the result; the caller fills the ones that are still empty.
 */
export function recognizeSection(user: Partial<User>, section: string): Fields {
    const result: Fields = {};
    switch (section) {
        case 'passport': {
            const doc = impulsePassport(user.passportData);
            put(result, 'passportType', doc.type);
            put(result, 'passportSeries', doc.series);
            put(result, 'passportNumber', doc.number);
            put(result, 'passportIssueDate', doc.date);
            put(result, 'passportIssuer', doc.issuer);
            break;
        }
        case 'militaryTicket': {
            const doc = impulseDocument(user.militaryTicketInfo);
            put(result, 'militaryTicketSeries', doc.series);
            put(result, 'militaryTicketNumber', doc.number);
            put(result, 'militaryTicketIssueDate', doc.date);
            put(result, 'militaryTicketIssuer', doc.issuer);
            break;
        }
        case 'ubd': {
            const doc = impulseDocument(user.participantNumber || user.ubdStatus);
            put(result, 'ubdSeries', doc.series);
            put(result, 'ubdNumber', doc.number);
            put(result, 'ubdIssueDate', doc.date);
            put(result, 'ubdIssuer', doc.issuer);
            break;
        }
        case 'driverLicense': {
            const doc = impulseDriverLicence(user.driverLicenses || user.rights);
            put(result, 'driverLicenseCategories', doc.categories);
            put(result, 'driverLicenseSeries', doc.series);
            put(result, 'driverLicenseNumber', doc.number);
            break;
        }
        case 'registration':
        case 'residence': {
            const prefix = section === 'registration' ? 'reg' : 'live';
            const address = impulseAddress(
                section === 'registration' ? user.registeredAddress : user.residenceAddress,
            );
            put(result, `${prefix}Region` as keyof User, address.region);
            put(result, `${prefix}District` as keyof User, address.district);
            put(result, `${prefix}Settlement` as keyof User, address.settlement);
            put(result, `${prefix}CityDistrict` as keyof User, address.cityDistrict);
            put(result, `${prefix}StreetType` as keyof User, address.streetType);
            put(result, `${prefix}Street` as keyof User, address.street);
            put(result, `${prefix}House` as keyof User, address.house);
            put(result, `${prefix}Flat` as keyof User, address.flat);
            break;
        }
        case 'service': {
            const order = impulseOrder(user.rankAssignedBy);
            put(result, 'rank', impulseRank(user.rank));
            if (!parseDate(user.rankAssignmentDate)) put(result, 'rankAssignmentDate', order.date);
            put(result, 'rankOrderNumber', order.number);
            put(result, 'rankOrderIssuer', order.issuer);
            put(
                result,
                'serviceType',
                dictionaryValue(user.serviceType, IMPULSE_SERVICE_TYPES, SERVICE_TYPES),
            );
            put(
                result,
                'fitnessCategory',
                dictionaryValue(user.fitnessCategory, IMPULSE_FITNESS, FITNESS),
            );
            break;
        }
        case 'identity': {
            put(
                result,
                'maritalStatus',
                dictionaryValue(user.maritalStatus, IMPULSE_MARITAL_STATUSES, MARITAL),
            );
            const taxId = impulseTaxId({
                taxId: user.taxId,
                identificationNumber: user.identificationNumber,
            });
            put(result, 'taxId', taxId);
            break;
        }
        case 'health':
            put(result, 'bloodType', impulseBloodType(user.bloodType));
            break;
        case 'appointment': {
            const order = impulseOrder(user.appointmentOrder);
            const drill = isDrillOrder(user.appointmentOrder);
            put(result, drill ? 'drillOrderDate' : 'appointmentOrderDate', order.date);
            put(result, drill ? 'drillOrderNumber' : 'appointmentOrderNumber', order.number);
            put(result, drill ? 'drillOrderIssuer' : 'appointmentOrderIssuer', order.issuer);
            break;
        }
    }
    return result;
}

/** Sections whose free text `recognizeSection` can read. */
export const RECOGNIZABLE_SECTIONS = new Set([
    'identity',
    'passport',
    'militaryTicket',
    'ubd',
    'driverLicense',
    'registration',
    'residence',
    'service',
    'health',
    'appointment',
]);
