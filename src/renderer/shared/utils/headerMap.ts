import { useI18nStore } from '../../stores/i18nStore';

// src/utils/headerMap.ts

export const HEADER_MAP: Record<string, string> = {
    // ✅ Basic personal info
    ПІБ: 'fullName',
    Фото: 'photo',
    '№телефону': 'phoneNumber',
    Телефон: 'phoneNumber',
    Email: 'email',
    'Дата народження': 'dateOfBirth',
    'Місце народження': 'placeOfBirth',
    Стать: 'gender',
    'Статус військовослужбовця': 'soldierStatus',
    // ✅ Position & rank (all cases)
    посада: 'position',
    'повна посада називний': 'positionNominative',
    'повна посада родовий': 'positionGenitive',
    'повна посада давальний': 'positionDative',
    'повна посада орудний': 'positionInstrumental',
    'В/звання за списком': 'rank',
    'Ким присвоєно, № наказу': 'rankAssignedBy',
    'Дата присвоєння': 'rankAssignmentDate',
    'Дата присвоєння_1': 'rankAssignmentDate',

    // ✅ Rights & service info
    Права: 'rights',
    'Мобілізований чи контракт': 'serviceType',
    'Яким ТЦК та СП призваний': 'recruitmentOfficeDetails',
    Примітки: 'notes',
    коментарі: 'comments',
    історія: 'history',

    // ✅ Education & awards
    'Освіта (категорія, повна назва та місцезнаходження закладу, дата випуску)': 'educationDetails',
    Освіта: 'education',
    Нагороди: 'awards',
    'Цивільна професія': 'civilProfession',

    // ✅ Relatives & family
    'Сімейний стан': 'maritalStatus',
    'ПІБ дружини (батька, матері, близьких родичів)': 'familyInfo',
    'ПІБ дітей та рік народження': 'childrenInfo',
    Родичі: 'relatives',

    // ✅ Addresses
    'Адреса реєстрації (фактична)': 'residenceAddress',
    'Адреса прописки': 'registeredAddress',

    // ✅ Military data
    ВОС: 'vosCode',
    ШПК: 'shpkCode',
    '№ по штату': 'shpkNumber',
    КШП: 'kshp',
    кат: 'category',
    'Призовні дані': 'conscriptionInfo',
    'Військовий квиток (посвідчення офіцера)': 'militaryTicketInfo',
    'Періоди проходження служби': 'militaryServiceHistory',
    'Бойовий досвід': 'ubdStatus',
    УБД: 'ubdStatus',
    'Резерв/в запасі': 'rvbzPresence',
    БЗВП: 'bzvpStatus',

    // ✅ Appointments
    'наказ на прийом': 'appointmentOrder',
    'Стройовий наказ про прийняття посади': 'appointmentOrder',
    '№та дата наказу про призначення': 'appointmentOrder',
    'Попередній статус': 'previousStatus',

    // ✅ Legal
    'Наявність особової справи': 'personalPrisonFileExists',
    'Чи є судимість': 'hasCriminalRecord',
    'Деталі судимості': 'criminalRecordDetails',

    // ✅ Identification
    ІПН: 'taxId',
    Паспорт: 'passportData',
    'Військовий квиток': 'militaryTicketInfo',
    'Посвідчення учасника бойових дій': 'participantNumber',
    'Ідентифікаційний номер': 'identificationNumber',

    // ✅ Driver license & blood type
    'Водійські права': 'driverLicenses',
    'Група крові': 'bloodType',

    // ✅ Subordination & unit
    підрозділ: 'unitMain',
    підпорядкування: 'subordination',
    'підрозділ 1': 'unitLevel1',
    'підрозділ 2': 'unitLevel2',
    взвод: 'platoon',
    відділення: 'squad',
    'Номер підрозділу': 'unitNumber',

    // ✅ Absence & status
    'Причина відсутності': 'absenceReason',
    'Дата відсутності з': 'absenceFromDate',
    'Дата відсутності по': 'absenceToDate',

    // ✅ Health
    "Стан здоров'я": 'healthConditions',
    'Категорія придатності': 'fitnessCategory',

    // ✅ Recruiting & religion
    Релігія: 'religion',
    Військкомат: 'recruitingOffice',

    // ✅ Extra Excel-only
    't.': 'tDotData',

    // ✅ Особова картка as in Impulse (columns a unit may add to its Excel)
    Позивний: 'callsign',
    'Тип паспорта': 'passportType',
    'Серія паспорта': 'passportSeries',
    'Номер паспорта': 'passportNumber',
    'Паспорт ким виданий': 'passportIssuer',
    'Дата видачі паспорта': 'passportIssueDate',
    'Закордонний паспорт': 'foreignPassportNumber',
    'Серія військового квитка': 'militaryTicketSeries',
    'Номер військового квитка': 'militaryTicketNumber',
    'Військовий квиток ким виданий': 'militaryTicketIssuer',
    'Дата видачі військового квитка': 'militaryTicketIssueDate',
    'Серія посвідчення УБД': 'ubdSeries',
    'Номер посвідчення УБД': 'ubdNumber',
    'Посвідчення УБД ким видане': 'ubdIssuer',
    'Дата видачі посвідчення УБД': 'ubdIssueDate',
    'Категорії водія': 'driverLicenseCategories',
    IBAN: 'iban',
    'Банківська картка': 'bankCard',
    'Назва банку': 'bankName',
    'Додатковий телефон': 'extraPhone',
    Громадянство: 'citizenship',
    'Країна народження': 'birthCountry',
    Національність: 'nationality',
    Теги: 'tags',
    'Номер наказу про присвоєння звання': 'rankOrderNumber',
    'Ким присвоєно звання': 'rankOrderIssuer',
    'Дата наказу про призначення': 'appointmentOrderDate',
    'Номер наказу про призначення': 'appointmentOrderNumber',
    'Дата призову': 'conscriptionDate',
    'Дата прийняття присяги': 'oathDate',
    'Дата наказу на зарахування': 'enlistmentOrderDate',
    'Номер наказу на зарахування': 'enlistmentOrderNumber',
    'БЗВП з': 'bzvpFrom',
    'БЗВП по': 'bzvpTo',
    'Місце проходження БЗВП': 'bzvpPlace',
    Вислуга: 'serviceLength',
    'Вчене звання': 'academicTitle',
};

export const DB_LABELS: Record<string, string> = Object.entries(HEADER_MAP).reduce(
    (acc, [ua, db]) => {
        acc[db] = ua; // e.g. fullName -> "ПІБ"
        return acc;
    },
    {} as Record<string, string>,
);

/** Label of a database column: the card's own label, the Excel heading, or the column name. */
export const getFieldLabel = (key: string): string => {
    const cardLabel = useI18nStore.getState().t(`card.fields.${key}`);
    if (cardLabel !== `card.fields.${key}`) return cardLabel;
    return DB_LABELS[key] || key;
};
