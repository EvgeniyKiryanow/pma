import {
    clean,
    formatDate,
    impulseBloodType,
    impulseRank,
    parseDate,
} from '../../../../shared/personnel/recognize';
import type { EducationEntry, RelativeContact, User } from '../../../../shared/types/user';
import { IMPULSE_COLUMNS, IMPULSE_EDUCATION_COLUMNS } from './impulseExport';

/**
 * Reading a workbook of Impulse Toolkit (the personnel form «Додаток 1 — Особовий склад» and
 * «Додаток 2 — Освіта і курси») back into the cards: the mirror of `impulseExport`.
 *
 * Columns are found by their group and title, not by position or by the title alone: the
 * form repeats titles («Дата видачі» five times) and a template may move a column. Only a
 * filled cell changes a card — an empty one never clears what PManager holds. Names are
 * only used to find the person (as in Impulse itself); a new person gets them.
 */

export type Cell = string | number | boolean | Date | null | undefined;
export type SheetRows = Cell[][];

type FieldKind = 'text' | 'date' | 'digits' | 'rank' | 'gender' | 'blood' | 'multi';

type Target =
    | { field: keyof User & string; kind?: FieldKind; onlyWhenEmpty?: boolean }
    | { special: 'last' | 'first' | 'middle' | 'parents' | 'spouse' | 'children' | 'called-up' };

const field = (
    name: keyof User & string,
    kind: FieldKind = 'text',
    onlyWhenEmpty = false,
): Target => ({ field: name, kind, onlyWhenEmpty });
const special = (name: Extract<Target, { special: string }>['special']): Target => ({
    special: name,
});

/** What each column of Додаток 1 fills, in the order of IMPULSE_COLUMNS. */
export const IMPULSE_TARGETS: Target[] = [
    // Особиста інформація
    special('last'),
    special('first'),
    special('middle'),
    field('taxId', 'digits'),
    field('gender', 'gender'),
    field('dateOfBirth', 'date'),
    field('callsign'),
    // Внутрішній паспорт
    field('passportIssuer'),
    field('passportIssueDate', 'date'),
    field('passportSeries'),
    field('passportNumber', 'digits'),
    field('passportType'),
    // Закордонний паспорт
    field('foreignPassportIssuer'),
    field('foreignPassportIssueDate', 'date'),
    field('foreignPassportNumber'),
    // Військовий квиток
    field('vosCode'),
    field('militaryTicketIssuer'),
    field('militaryTicketIssueDate', 'date'),
    field('militaryTicketSeries'),
    field('militaryTicketNumber', 'digits'),
    // УБД
    field('ubdIssuer'),
    field('ubdIssueDate', 'date'),
    field('ubdSeries'),
    field('ubdNumber', 'digits'),
    // Фінансові дані
    field('iban'),
    field('bankCard', 'digits'),
    field('bankName'),
    // Посвідчення водія
    field('driverLicenseIssuer'),
    field('driverLicenseCategories', 'multi'),
    field('driverLicenseValidUntil', 'date'),
    field('driverLicenseIssueDate', 'date'),
    field('drivingExperience'),
    field('driverLicenseSeries'),
    field('driverLicenseNumber', 'digits'),
    // Посвідчення тракториста-машиніста
    field('tractorLicenseIssuer'),
    field('tractorLicenseCategories', 'multi'),
    field('tractorLicenseValidUntil', 'date'),
    field('tractorLicenseIssueDate', 'date'),
    field('tractorExperience'),
    field('tractorLicenseSeries'),
    field('tractorLicenseNumber', 'digits'),
    // Місце реєстрації
    field('regRegion'),
    field('regDistrict'),
    field('regSettlement'),
    field('regCityDistrict'),
    field('regStreetType'),
    field('regStreet'),
    field('regHouse'),
    field('regFlat'),
    // Місце проживання
    field('liveRegion'),
    field('liveDistrict'),
    field('liveSettlement'),
    field('liveCityDistrict'),
    field('liveStreetType'),
    field('liveStreet'),
    field('liveHouse'),
    field('liveFlat'),
    // Контактні дані
    field('phoneNumber', 'digits'),
    field('extraPhone', 'digits'),
    field('email'),
    // Наказ на присвоєння звання
    field('rank', 'rank'),
    field('rankAssignmentDate', 'date'),
    field('rankOrderNumber'),
    field('rankOrderIssuer'),
    // Наказ на призначення (по особовому складу)
    field('appointmentOrderDate', 'date'),
    field('appointmentOrderNumber'),
    field('appointmentOrderIssuer'),
    // Наказ на призначення (по стройовій частині)
    field('drillOrderDate', 'date'),
    field('drillOrderNumber'),
    field('drillOrderIssuer'),
    // БЗВП
    field('bzvpFrom', 'date'),
    field('bzvpTo', 'date'),
    field('bzvpPlace'),
    field('bzvpCommander'),
    field('bzvpComment'),
    // Персональна інформація
    field('citizenship'),
    field('birthCountry'),
    field('placeOfBirth'),
    field('maritalStatus'),
    field('nationality'),
    field('religion'),
    field('tags'),
    // Вчене звання
    field('academicTitle'),
    field('academicTitleAssignedBy'),
    field('academicTitleDate', 'date'),
    field('scientificWorks'),
    // Виборчі органи
    field('electedBody'),
    field('electedDate', 'date'),
    field('electedUntil', 'date'),
    field('electedPosition'),
    // Медична інформація
    field('bloodType', 'blood'),
    // Проходження служби
    field('fitnessCategory'),
    field('oathDate', 'date'),
    field('militaryServiceHistory'),
    field('serviceType'),
    field('conscriptionDate', 'date'),
    field('enlistmentOrderDate', 'date'),
    field('enlistmentOrderNumber'),
    special('called-up'),
    field('recruitingOffice'),
    // Вислуга
    field('serviceLengthDate', 'date'),
    field('serviceLength'),
    field('preferentialServiceLengthDate', 'date'),
    field('preferentialServiceLength'),
    // Додатково: a comment of Impulse never replaces the notes written here.
    field('notes', 'text', true),
    // Склад сім'ї
    special('parents'),
    special('spouse'),
    special('children'),
];

// ---------------------------------------------------------------- cells

/** Header text compared loosely: case, spaces, «*», «+» and the kind of apostrophe aside. */
export const headerKey = (value: Cell): string =>
    clean(value)
        .toLowerCase()
        .replace(/[ʼ’‘`]/g, "'")
        .replace(/[*+]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

/** A name compared loosely (the same person written with another apostrophe or case). */
export const nameKey = (value: unknown): string =>
    clean(value)
        .toLowerCase()
        .replace(/[ʼ’‘`]/g, "'")
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ')
        .trim();

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/** ДД.ММ.РРРР of a cell: an Excel date number, a Date or a written date; null otherwise. */
export function cellDate(value: Cell): string | null {
    if (value instanceof Date) {
        if (isNaN(value.getTime())) return null;
        return formatDate(
            new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())),
        );
    }
    if (typeof value === 'number') {
        // 1 = 01.01.1900 … 73050 = 31.12.2099; the time of day is dropped.
        if (value < 1 || value > 73050) return null;
        return formatDate(new Date(EXCEL_EPOCH + Math.floor(value) * 86_400_000));
    }
    return formatDate(parseDate(value));
}

/** Text of a cell. A number too long for Excel to keep exactly (a card number) is unreliable. */
export function cellText(value: Cell): string | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return cellDate(value);
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        if (Number.isInteger(value) && !Number.isSafeInteger(value)) return null;
        return Number.isInteger(value) ? value.toFixed(0) : String(value);
    }
    const text = clean(value);
    return text ? text : null;
}

/** A value of a cell for a field of the card, or null when there is nothing sure. */
function fieldValue(kind: FieldKind, value: Cell): string | null {
    switch (kind) {
        case 'date':
            return cellDate(value);
        case 'digits': {
            // Excel keeps numbers without their text form: 15 significant digits at most.
            if (typeof value === 'number' && value >= 1e15) return null;
            return cellText(value);
        }
        case 'rank':
            return impulseRank(value) ?? cellText(value);
        case 'gender': {
            const text = headerKey(value);
            if (text === 'ч' || text.startsWith('чол')) return 'male';
            if (text === 'ж' || text.startsWith('жін')) return 'female';
            return null;
        }
        case 'blood':
            return impulseBloodType(value) ?? cellText(value);
        case 'multi':
            return cellText(value)?.replace(/\s*[,;]\s*/g, ',') ?? null;
        default:
            return cellText(value);
    }
}

/** РНОКПП: ten digits; Excel drops a leading zero of a number. */
export function taxIdOf(value: Cell): string | null {
    const text = cellText(value)?.replace(/\s/g, '') ?? '';
    if (/^\d{9}$/.test(text) && typeof value === 'number') return `0${text}`;
    return /^\d{10}$/.test(text) ? text : null;
}

// ---------------------------------------------------------------- layout

export type ImpulseSheetKind = 'personnel' | 'education';

export type ImpulseLayout = {
    kind: ImpulseSheetKind;
    /** Index (0-based) of the first data row. */
    dataFrom: number;
    /** For each column of the sheet: the index into the form's columns, or -1. */
    columns: number[];
    /** How many of the form's columns were found. */
    found: number;
};

const PERSONNEL_KEYS = new Map(
    IMPULSE_COLUMNS.map((column, index) => [
        `${headerKey(column.group)}|${headerKey(column.title)}`,
        index,
    ]),
);
const EDUCATION_KEYS = new Map(
    IMPULSE_EDUCATION_COLUMNS.map((column, index) => [headerKey(column.title), index]),
);

/** A row of column numbers 1, 2, 3… under the titles. */
const isNumbering = (row: Cell[] | undefined) =>
    Boolean(row) && Number(row![0]) === 1 && Number(row![1]) === 2 && Number(row![2]) === 3;

/** Group headings are merged cells: the value sits in the first cell of the run. */
function groupsOf(row: Cell[] | undefined, width: number): string[] {
    const groups: string[] = [];
    let current = '';
    for (let c = 0; c < width; c++) {
        const group = headerKey(row?.[c]);
        if (group) current = group;
        groups.push(current);
    }
    return groups;
}

/** The layout when at least three columns of the form were found. */
function layoutOf(
    kind: ImpulseSheetKind,
    dataFrom: number,
    columns: number[],
): ImpulseLayout | null {
    const found = new Set(columns.filter((index) => index >= 0)).size;
    return found >= 3 ? { kind, dataFrom, columns, found } : null;
}

/** Finds the Impulse form in the first rows of a sheet; null when it is something else. */
export function detectImpulseSheet(rows: SheetRows): ImpulseLayout | null {
    for (let r = 0; r < Math.min(rows.length, 12); r++) {
        const titles = (rows[r] ?? []).map(headerKey);
        const dataFrom = isNumbering(rows[r + 1]) ? r + 2 : r + 1;
        let layout: ImpulseLayout | null = null;
        if (titles.includes('прізвище') && titles.includes("ім'я")) {
            const groups = groupsOf(rows[r - 1], titles.length);
            layout = layoutOf(
                'personnel',
                dataFrom,
                titles.map((title, c) => PERSONNEL_KEYS.get(`${groups[c]}|${title}`) ?? -1),
            );
        } else if (titles.includes('піб') && titles.includes('тип освіти')) {
            layout = layoutOf(
                'education',
                dataFrom,
                titles.map((title) => EDUCATION_KEYS.get(title) ?? -1),
            );
        }
        if (layout) return layout;
    }
    return null;
}

// ---------------------------------------------------------------- reading rows

export type ImpulsePerson = {
    /** Row of the sheet (1-based, as Excel shows it). */
    row: number;
    fullName: string;
    taxId: string | null;
    dateOfBirth: string | null;
    /** Card fields the file fills (non-empty cells only). */
    values: Partial<Record<keyof User & string, string>>;
    /** Office that called the person up (see `planImpulseImport`). */
    calledUpBy: string | null;
    relatives: RelativeContact[];
    childrenInfo: string | null;
};

const PHONE = /^\+?[\d\s()-]{9,}$/;

/** «ПІБ, місце проживання, телефон; ПІБ, …» of the family columns. */
function relativesOf(text: string | null, relationship: string): RelativeContact[] {
    if (!text) return [];
    return text
        .split(/\s*;\s*|\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const parts = line
                .split(/\s*,\s*/)
                .map((part) => part.trim())
                .filter(Boolean);
            const phone = parts.find((part) => PHONE.test(part));
            const rest = parts.filter((part) => part !== phone);
            return {
                name: rest[0] ?? line,
                relationship,
                ...(phone ? { phone } : {}),
                ...(rest.length > 1 ? { notes: rest.slice(1).join(', ') } : {}),
            };
        });
}

const isEmptyRow = (row: Cell[] | undefined) =>
    !row || row.every((value) => cellText(value as Cell) === null);

type Special = Extract<Target, { special: string }>['special'];

/** One row of Додаток 1 as the card fields and the columns that are not fields. */
function readPersonRow(row: Cell[], layout: ImpulseLayout) {
    const values: ImpulsePerson['values'] = {};
    const special: Partial<Record<Special, string>> = {};
    layout.columns.forEach((index, c) => {
        if (index < 0) return;
        const target = IMPULSE_TARGETS[index];
        if ('special' in target) {
            const text = cellText(row[c]);
            if (text) special[target.special] = text;
        } else if (target.field === 'taxId') {
            const taxId = taxIdOf(row[c]);
            if (taxId) values.taxId = taxId;
        } else {
            const value = fieldValue(target.kind ?? 'text', row[c]);
            if (value !== null) values[target.field] = value;
        }
    });
    return { values, special };
}

export function readImpulsePersonnel(rows: SheetRows, layout: ImpulseLayout): ImpulsePerson[] {
    const people: ImpulsePerson[] = [];
    for (let r = layout.dataFrom; r < rows.length; r++) {
        if (isEmptyRow(rows[r])) continue;
        const { values, special } = readPersonRow(rows[r], layout);
        // A row without surname and name cannot be matched to anyone (a note under the form).
        if (!special.last || !special.first) continue;
        people.push({
            row: r + 1,
            fullName: [special.last, special.first, special.middle].filter(Boolean).join(' '),
            taxId: values.taxId ?? null,
            dateOfBirth: values.dateOfBirth ?? null,
            values,
            calledUpBy: special['called-up'] ?? null,
            relatives: [
                ...relativesOf(special.parents ?? null, 'батьки'),
                ...relativesOf(special.spouse ?? null, 'дружина / чоловік'),
            ],
            childrenInfo: special.children ?? null,
        });
    }
    return people;
}

export type ImpulseEducationRow = {
    row: number;
    fullName: string;
    taxId: string | null;
    entry: Omit<EducationEntry, 'id'>;
};

const EDUCATION_FIELDS: (keyof Omit<EducationEntry, 'id'> | 'fullName' | 'taxId')[] = [
    'fullName',
    'taxId',
    'type',
    'level',
    'form',
    'courses',
    'institution',
    'institutionType',
    'specialty',
    'startYear',
    'endYear',
    'comment',
];

export function readImpulseEducation(
    rows: SheetRows,
    layout: ImpulseLayout,
): ImpulseEducationRow[] {
    const result: ImpulseEducationRow[] = [];
    for (let r = layout.dataFrom; r < rows.length; r++) {
        const row = rows[r];
        if (isEmptyRow(row)) continue;
        let fullName = '';
        let taxId: string | null = null;
        const entry: Omit<EducationEntry, 'id'> = {};
        layout.columns.forEach((index, c) => {
            if (index < 0) return;
            const key = EDUCATION_FIELDS[index];
            if (key === 'taxId') {
                taxId = taxIdOf(row[c]);
                return;
            }
            const text = cellText(row[c]);
            if (!text) return;
            if (key === 'fullName') fullName = text;
            else entry[key] = text;
        });
        if (!fullName || !Object.keys(entry).length) continue;
        result.push({ row: r + 1, fullName, taxId, entry });
    }
    return result;
}

// ---------------------------------------------------------------- plan

export type ImpulseUpdate = {
    user: User;
    /** The card as it will be saved. */
    next: User;
    /** Fields that change (for the summary and the history of the card). */
    fields: string[];
};

export type ImpulsePlan = {
    create: Partial<User>[];
    update: ImpulseUpdate[];
    unchanged: number;
    /** Rows that fit more than one person here: left alone. */
    ambiguous: { row: number; fullName: string; sheet: ImpulseSheetKind }[];
    /** Education rows of people found neither here nor in the personnel sheet. */
    unmatched: { row: number; fullName: string }[];
    /** New education lines. */
    education: number;
};

const digits = (value: unknown) => clean(value).replace(/\s/g, '');

/** Same value for the card: dates by the day, ranks by the dictionary, text by its words. */
function same(field: string, current: unknown, next: string): boolean {
    const now = clean(current);
    if (now === next) return true;
    if (!now) return false;
    const date = parseDate(now);
    const incoming = parseDate(next);
    if (date && incoming) return date.getTime() === incoming.getTime();
    if (field === 'rank') return impulseRank(now) === impulseRank(next);
    if (field === 'bloodType') return impulseBloodType(now) === impulseBloodType(next);
    if (/Number$|Series$|phone|Phone|taxId|iban|bankCard/.test(field))
        return digits(now).toUpperCase() === digits(next).toUpperCase();
    return nameKey(now) === nameKey(next);
}

const educationKey = (entry: Omit<EducationEntry, 'id'>) =>
    [entry.type, entry.level, entry.institution, entry.specialty, entry.endYear, entry.courses]
        .map(nameKey)
        .join('|');

const newId = () =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type Finder = {
    find: (fullName: string, taxId: string | null, dateOfBirth: string | null) => User[];
};

function finder(users: User[]): Finder {
    const byTax = new Map<string, User[]>();
    const byName = new Map<string, User[]>();
    const push = (map: Map<string, User[]>, key: string, user: User) => {
        if (!key) return;
        map.set(key, [...(map.get(key) ?? []), user]);
    };
    for (const user of users) {
        for (const id of new Set([digits(user.taxId), digits(user.identificationNumber)])) {
            if (/^\d{10}$/.test(id)) push(byTax, id, user);
        }
        push(byName, nameKey(user.fullName), user);
    }
    return {
        find(fullName, taxId, dateOfBirth) {
            if (taxId && byTax.get(taxId)?.length === 1) return byTax.get(taxId)!;
            const named = byName.get(nameKey(fullName)) ?? [];
            if (named.length <= 1 || !dateOfBirth) return named;
            const born = parseDate(dateOfBirth)?.getTime();
            const sameDay = named.filter((user) => parseDate(user.dateOfBirth)?.getTime() === born);
            return sameDay.length ? sameDay : named;
        },
    };
}

/** A card that is going to be saved: how it was, how it will be, which fields change. */
type Draft = { user: User; next: User; fields: Set<string> };

/** Sets `key` of the card when the file says something else; returns whether it changed. */
function put(draft: Draft, key: string, value: string): boolean {
    const next = draft.next as unknown as Record<string, unknown>;
    if (same(key, next[key], value)) return false;
    next[key] = value;
    draft.fields.add(key);
    return true;
}

const onlyWhenEmpty = new Set(
    IMPULSE_TARGETS.flatMap((target) =>
        'field' in target && target.onlyWhenEmpty ? [target.field] : [],
    ),
);

/** What a row of Додаток 1 changes in a card that exists. */
function applyPerson(draft: Draft, person: ImpulsePerson): void {
    const next = draft.next as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(person.values)) {
        if (value === undefined) continue;
        if (onlyWhenEmpty.has(key as keyof User & string) && clean(next[key])) continue;
        put(draft, key, value);
    }
    // «ТЦК (призов)»: older cards keep their only office in «recruitingOffice», and the
    // export writes it as the one that called the person up.
    const calledUp = person.calledUpBy;
    const keptAsOnlyOffice =
        !clean(next.recruitmentOfficeDetails) &&
        same('recruitingOffice', next.recruitingOffice, calledUp ?? '');
    if (calledUp && !keptAsOnlyOffice) put(draft, 'recruitmentOfficeDetails', calledUp);
    if (person.childrenInfo) put(draft, 'childrenInfo', person.childrenInfo);

    const relatives = Array.isArray(draft.next.relatives) ? draft.next.relatives : [];
    const known = new Set(relatives.map((relative) => nameKey(relative.name)));
    const added = person.relatives.filter((relative) => !known.has(nameKey(relative.name)));
    if (added.length) {
        draft.next.relatives = [...relatives, ...added];
        draft.fields.add('relatives');
    }
}

/** A new card from a row of Додаток 1. */
function newCard(person: ImpulsePerson): Partial<User> {
    return {
        fullName: person.fullName,
        ...person.values,
        ...(person.calledUpBy ? { recruitmentOfficeDetails: person.calledUpBy } : {}),
        ...(person.childrenInfo ? { childrenInfo: person.childrenInfo } : {}),
        relatives: person.relatives,
        educationList: [],
    } as unknown as Partial<User>;
}

/** Fills the empty fields of a new card with what a second row of the same person says. */
function mergeInto(card: Partial<User>, person: ImpulsePerson): void {
    const fields = card as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(person.values)) {
        if (value !== undefined && !clean(fields[key])) fields[key] = value;
    }
}

/** Adds an education line unless the card has it already; returns whether it was added. */
function addEducation(card: Partial<User>, entry: Omit<EducationEntry, 'id'>): boolean {
    const list = Array.isArray(card.educationList) ? card.educationList : [];
    const key = educationKey(entry);
    if (list.some((line) => educationKey(line) === key)) return false;
    card.educationList = [...list, { id: newId(), ...entry }];
    return true;
}

type PlanContext = {
    find: Finder;
    draftOf: (user: User) => Draft;
    findCreated: (fullName: string, taxId: string | null, born: string | null) => User[];
    created: Partial<User>[];
    plan: ImpulsePlan;
    options: { createMissing?: boolean };
};

/** A line of Додаток 2: the card it belongs to gets it, unless it is there already. */
function planEducation(line: ImpulseEducationRow, context: PlanContext): void {
    const { plan } = context;
    const matches = context.find.find(line.fullName, line.taxId, null);
    if (matches.length > 1) {
        plan.ambiguous.push({ row: line.row, fullName: line.fullName, sheet: 'education' });
        return;
    }
    const draft = matches.length === 1 ? context.draftOf(matches[0]) : null;
    let card: Partial<User> | null = draft?.next ?? null;
    if (!card) {
        const fresh = context.findCreated(line.fullName, line.taxId, null);
        card = fresh.length === 1 ? fresh[0] : null;
    }
    if (!card && context.options.createMissing) {
        card = {
            fullName: line.fullName,
            ...(line.taxId ? { taxId: line.taxId } : {}),
            relatives: [],
            educationList: [],
        };
        context.created.push(card);
    }
    if (!card) {
        plan.unmatched.push({ row: line.row, fullName: line.fullName });
    } else if (addEducation(card, line.entry)) {
        draft?.fields.add('educationList');
        plan.education++;
    }
}

/**
 * What importing the file would do to the cards: who is new, whose card changes and how,
 * which rows are left alone because they fit several people.
 */
export function planImpulseImport(
    people: ImpulsePerson[],
    education: ImpulseEducationRow[],
    existing: User[],
    /** People found only in «Освіта і курси» get a card (name, РНОКПП, education). */
    options: { createMissing?: boolean } = {},
): ImpulsePlan {
    const plan: ImpulsePlan = {
        create: [],
        update: [],
        unchanged: 0,
        ambiguous: [],
        unmatched: [],
        education: 0,
    };
    const find = finder(existing);
    // The card each existing person will be saved with (several rows may touch one card).
    const pending = new Map<number, Draft>();
    const draftOf = (user: User): Draft => {
        if (!pending.has(user.id))
            pending.set(user.id, { user, next: { ...user }, fields: new Set() });
        return pending.get(user.id)!;
    };
    const created = plan.create;
    const findCreated = (fullName: string, taxId: string | null, born: string | null) =>
        finder(created as User[]).find(fullName, taxId, born);

    for (const person of people) {
        const matches = find.find(person.fullName, person.taxId, person.dateOfBirth);
        if (matches.length > 1) {
            plan.ambiguous.push({ row: person.row, fullName: person.fullName, sheet: 'personnel' });
        } else if (matches.length === 1) {
            applyPerson(draftOf(matches[0]), person);
        } else {
            // The same person twice in the file: one new card with what both rows say.
            const twin = findCreated(person.fullName, person.taxId, person.dateOfBirth);
            if (twin.length === 1) mergeInto(twin[0], person);
            else created.push(newCard(person));
        }
    }

    const context = { find, draftOf, findCreated, created, plan, options };
    for (const line of education) planEducation(line, context);

    for (const draft of pending.values()) {
        if (draft.fields.size) {
            plan.update.push({ user: draft.user, next: draft.next, fields: [...draft.fields] });
        } else {
            plan.unchanged++;
        }
    }
    return plan;
}

/** The sheets of a workbook that are the forms of Impulse Toolkit. */
export function impulseSheetsOf(sheets: Record<string, SheetRows>): Set<string> {
    return new Set(Object.keys(sheets).filter((name) => detectImpulseSheet(sheets[name])));
}
