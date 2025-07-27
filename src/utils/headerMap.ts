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
};

export const DB_LABELS: Record<string, string> = Object.entries(HEADER_MAP).reduce(
    (acc, [ua, db]) => {
        acc[db] = ua; // e.g. fullName -> "ПІБ"
        return acc;
    },
    {} as Record<string, string>,
);

// ✅ For any unmapped field → show raw key
export const getFieldLabel = (key: string): string => {
    return DB_LABELS[key] || key;
};
