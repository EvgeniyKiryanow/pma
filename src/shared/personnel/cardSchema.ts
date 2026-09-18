import type { User } from '../types/user';
import {
    IMPULSE_ACADEMIC_TITLES,
    IMPULSE_BLOOD_TYPES,
    IMPULSE_CITIZENSHIPS,
    IMPULSE_COUNTRIES,
    IMPULSE_DRIVER_CATEGORIES,
    IMPULSE_FITNESS,
    IMPULSE_MARITAL_STATUSES,
    IMPULSE_PASSPORT_TYPES,
    IMPULSE_RANKS,
    IMPULSE_SERVICE_TYPES,
    IMPULSE_TRACTOR_CATEGORIES,
} from './impulseDictionaries';

/**
 * The card of a service member in three categories: «Особова картка» (the Impulse card and
 * education), «Нагороди» and «Посада за штатом» (what comes from the БЧС). The editor, the
 * card view, the Excel headers and the report placeholders are all built from this list.
 * Labels: `card.fields.<key>`, `card.sections.<id>`, `card.categories.<id>` in the locales.
 */

export type CardFieldKind =
    /** Free text. */
    | 'text'
    /** A date written as ДД.ММ.РРРР (a calendar helps to pick it). */
    | 'date'
    /** One value of a dictionary; a value from older data is kept and shown as written. */
    | 'select'
    /** Free text with suggestions. */
    | 'combo'
    /** Several values of a dictionary, separated by commas (Impulse «+» columns). */
    | 'multi'
    | 'textarea'
    | 'checkbox'
    /** 'male' / 'female'. */
    | 'gender'
    /** The status list of the unit (renderer side). */
    | 'status';

export type CardField = {
    key: keyof User & string;
    kind?: CardFieldKind;
    options?: readonly string[];
    /** Takes the whole row. */
    wide?: boolean;
    /**
     * Kept as written in Excel or by older versions; the same data now has its own fields
     * above. Shown under the section, used by exports when the fields are empty.
     */
    legacy?: boolean;
};

/** Sections with an editor of their own (lists, the staff position). */
export type CardSectionEditor = 'relatives' | 'education' | 'awards' | 'staffPost';

export type CardSectionId =
    | 'identity'
    | 'contacts'
    | 'passport'
    | 'foreignPassport'
    | 'militaryTicket'
    | 'ubd'
    | 'driverLicense'
    | 'tractorLicense'
    | 'registration'
    | 'residence'
    | 'service'
    | 'bzvp'
    | 'serviceLength'
    | 'health'
    | 'finance'
    | 'family'
    | 'education'
    | 'extra'
    | 'awards'
    | 'staffPost'
    | 'appointment'
    | 'positionForms'
    | 'status'
    | 'structure';

export type CardSection = {
    id: CardSectionId;
    fields: CardField[];
    editor?: CardSectionEditor;
};

export type CardCategoryId = 'personal' | 'awards' | 'post';

export type CardCategory = { id: CardCategoryId; sections: CardSection[] };

export const STREET_TYPES = [
    'вулиця',
    'проспект',
    'провулок',
    'бульвар',
    'площа',
    'майдан',
    'узвіз',
    'тупик',
    'шосе',
    'набережна',
    'проїзд',
    'алея',
    'квартал',
    'мікрорайон',
] as const;

export const REGIONS = [
    'Вінницька область',
    'Волинська область',
    'Дніпропетровська область',
    'Донецька область',
    'Житомирська область',
    'Закарпатська область',
    'Запорізька область',
    'Івано-Франківська область',
    'Київська область',
    'Кіровоградська область',
    'Луганська область',
    'Львівська область',
    'Миколаївська область',
    'Одеська область',
    'Полтавська область',
    'Рівненська область',
    'Сумська область',
    'Тернопільська область',
    'Харківська область',
    'Херсонська область',
    'Хмельницька область',
    'Черкаська область',
    'Чернівецька область',
    'Чернігівська область',
    'Автономна Республіка Крим',
    'Київ',
    'Севастополь',
] as const;

const f = (key: CardField['key'], kind: CardFieldKind = 'text', extra: Partial<CardField> = {}) =>
    ({ key, kind, ...extra }) as CardField;
const date = (key: CardField['key']) => f(key, 'date');
const legacy = (key: CardField['key']) => f(key, 'textarea', { legacy: true, wide: true });

/** Address parts of the Impulse form; `prefix` is 'reg' or 'live'. */
const address = (prefix: 'reg' | 'live'): CardField[] => [
    f(`${prefix}Region` as CardField['key'], 'combo', { options: REGIONS }),
    f(`${prefix}District` as CardField['key']),
    f(`${prefix}Settlement` as CardField['key']),
    f(`${prefix}CityDistrict` as CardField['key']),
    f(`${prefix}StreetType` as CardField['key'], 'combo', { options: STREET_TYPES }),
    f(`${prefix}Street` as CardField['key']),
    f(`${prefix}House` as CardField['key']),
    f(`${prefix}Flat` as CardField['key']),
];

export const CARD: readonly CardCategory[] = [
    {
        id: 'personal',
        sections: [
            {
                id: 'identity',
                fields: [
                    f('fullName'),
                    f('callsign'),
                    f('gender', 'gender'),
                    date('dateOfBirth'),
                    f('taxId'),
                    f('placeOfBirth'),
                    f('birthCountry', 'combo', { options: IMPULSE_COUNTRIES }),
                    f('citizenship', 'combo', { options: IMPULSE_CITIZENSHIPS }),
                    f('nationality'),
                    f('religion'),
                    f('maritalStatus', 'select', { options: IMPULSE_MARITAL_STATUSES }),
                    f('tags'),
                    legacy('identificationNumber'),
                ],
            },
            {
                id: 'contacts',
                fields: [f('phoneNumber'), f('extraPhone'), f('email')],
            },
            {
                id: 'passport',
                fields: [
                    f('passportType', 'select', { options: IMPULSE_PASSPORT_TYPES }),
                    f('passportSeries'),
                    f('passportNumber'),
                    date('passportIssueDate'),
                    f('passportIssuer', 'text', { wide: true }),
                    legacy('passportData'),
                ],
            },
            {
                id: 'foreignPassport',
                fields: [
                    f('foreignPassportNumber'),
                    date('foreignPassportIssueDate'),
                    f('foreignPassportIssuer'),
                ],
            },
            {
                id: 'militaryTicket',
                fields: [
                    f('vosCode'),
                    f('militaryTicketSeries'),
                    f('militaryTicketNumber'),
                    date('militaryTicketIssueDate'),
                    f('militaryTicketIssuer', 'text', { wide: true }),
                    legacy('militaryTicketInfo'),
                ],
            },
            {
                id: 'ubd',
                fields: [
                    f('ubdSeries'),
                    f('ubdNumber'),
                    date('ubdIssueDate'),
                    f('ubdIssuer', 'text', { wide: true }),
                    legacy('participantNumber'),
                    legacy('ubdStatus'),
                ],
            },
            {
                id: 'driverLicense',
                fields: [
                    f('driverLicenseCategories', 'multi', { options: IMPULSE_DRIVER_CATEGORIES }),
                    f('driverLicenseSeries'),
                    f('driverLicenseNumber'),
                    date('driverLicenseIssueDate'),
                    date('driverLicenseValidUntil'),
                    f('drivingExperience'),
                    f('driverLicenseIssuer', 'text', { wide: true }),
                    legacy('driverLicenses'),
                    legacy('rights'),
                ],
            },
            {
                id: 'tractorLicense',
                fields: [
                    f('tractorLicenseCategories', 'multi', {
                        options: IMPULSE_TRACTOR_CATEGORIES,
                    }),
                    f('tractorLicenseSeries'),
                    f('tractorLicenseNumber'),
                    date('tractorLicenseIssueDate'),
                    date('tractorLicenseValidUntil'),
                    f('tractorExperience'),
                    f('tractorLicenseIssuer', 'text', { wide: true }),
                ],
            },
            {
                id: 'registration',
                fields: [...address('reg'), legacy('registeredAddress')],
            },
            {
                id: 'residence',
                fields: [...address('live'), legacy('residenceAddress')],
            },
            {
                id: 'service',
                fields: [
                    f('rank', 'combo', { options: IMPULSE_RANKS }),
                    date('rankAssignmentDate'),
                    f('rankOrderNumber'),
                    f('rankOrderIssuer'),
                    f('serviceType', 'select', { options: IMPULSE_SERVICE_TYPES, wide: true }),
                    date('conscriptionDate'),
                    f('recruitmentOfficeDetails'),
                    f('recruitingOffice'),
                    date('enlistmentOrderDate'),
                    f('enlistmentOrderNumber'),
                    date('oathDate'),
                    f('fitnessCategory', 'select', { options: IMPULSE_FITNESS }),
                    f('militaryServiceHistory', 'textarea', { wide: true }),
                    legacy('rankAssignedBy'),
                    legacy('conscriptionInfo'),
                ],
            },
            {
                id: 'bzvp',
                fields: [
                    date('bzvpFrom'),
                    date('bzvpTo'),
                    f('bzvpPlace'),
                    f('bzvpCommander'),
                    f('bzvpComment', 'text', { wide: true }),
                    legacy('bzvpStatus'),
                ],
            },
            {
                id: 'serviceLength',
                fields: [
                    date('serviceLengthDate'),
                    f('serviceLength'),
                    date('preferentialServiceLengthDate'),
                    f('preferentialServiceLength'),
                ],
            },
            {
                id: 'health',
                fields: [
                    f('bloodType', 'select', { options: IMPULSE_BLOOD_TYPES }),
                    f('healthConditions', 'textarea', { wide: true }),
                ],
            },
            {
                id: 'finance',
                fields: [f('iban', 'text', { wide: true }), f('bankCard'), f('bankName')],
            },
            {
                id: 'family',
                editor: 'relatives',
                fields: [
                    f('familyInfo', 'textarea', { wide: true }),
                    f('childrenInfo', 'textarea', { wide: true }),
                ],
            },
            {
                id: 'education',
                editor: 'education',
                fields: [f('civilProfession'), legacy('education'), legacy('educationDetails')],
            },
            {
                id: 'extra',
                fields: [
                    f('academicTitle', 'select', { options: IMPULSE_ACADEMIC_TITLES }),
                    f('academicTitleAssignedBy'),
                    date('academicTitleDate'),
                    f('scientificWorks', 'textarea', { wide: true }),
                    f('electedBody'),
                    f('electedPosition'),
                    date('electedDate'),
                    date('electedUntil'),
                    f('personalPrisonFileExists'),
                    f('hasCriminalRecord', 'checkbox'),
                    f('criminalRecordDetails', 'textarea', { wide: true }),
                    f('notes', 'textarea', { wide: true }),
                ],
            },
        ],
    },
    {
        id: 'awards',
        sections: [{ id: 'awards', editor: 'awards', fields: [legacy('awards')] }],
    },
    {
        id: 'post',
        sections: [
            {
                id: 'staffPost',
                editor: 'staffPost',
                fields: [f('kshp'), f('tDotData')],
            },
            {
                id: 'appointment',
                fields: [
                    date('appointmentOrderDate'),
                    f('appointmentOrderNumber'),
                    f('appointmentOrderIssuer'),
                    date('drillOrderDate'),
                    f('drillOrderNumber'),
                    f('drillOrderIssuer'),
                    legacy('appointmentOrder'),
                ],
            },
            {
                id: 'positionForms',
                fields: [
                    f('positionNominative'),
                    f('positionGenitive'),
                    f('positionDative'),
                    f('positionInstrumental'),
                ],
            },
            {
                id: 'status',
                fields: [
                    f('soldierStatus', 'status'),
                    f('previousStatus'),
                    f('isAttached', 'checkbox'),
                    f('attachedFrom'),
                    f('rvbzPresence'),
                    f('absenceReason'),
                    date('absenceFromDate'),
                    date('absenceToDate'),
                ],
            },
            {
                id: 'structure',
                fields: [
                    f('subordination'),
                    f('unitLevel1'),
                    f('unitLevel2'),
                    f('platoon'),
                    f('squad'),
                    f('unitNumber'),
                ],
            },
        ],
    },
];

/** Fields the staff position section shows from the БЧС (edited there, not in the card). */
export const STAFF_POST_FIELDS = [
    'shpkNumber',
    'unitMain',
    'position',
    'category',
    'shpkCode',
] as const satisfies readonly (keyof User)[];

/** Every field of the card, in the order of the card. */
export const CARD_FIELDS: readonly CardField[] = CARD.flatMap((category) =>
    category.sections.flatMap((section) => section.fields),
);

export function findCardSection(id: CardSectionId): CardSection | undefined {
    for (const category of CARD) {
        const section = category.sections.find((s) => s.id === id);
        if (section) return section;
    }
    return undefined;
}

/** The category a field belongs to (for the history of changes). */
export function categoryOfField(key: string): CardCategoryId | null {
    for (const category of CARD) {
        if (category.sections.some((section) => section.fields.some((f) => f.key === key))) {
            return category.id;
        }
    }
    return (STAFF_POST_FIELDS as readonly string[]).includes(key) ? 'post' : null;
}
