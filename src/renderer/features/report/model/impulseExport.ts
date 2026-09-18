import { awardsSummary } from '../../../../shared/awards/catalog';
import {
    IMPULSE_ACADEMIC_TITLES,
    IMPULSE_CITIZENSHIPS,
    IMPULSE_CIVIL_EDUCATION_LEVELS,
    IMPULSE_COUNTRIES,
    IMPULSE_DRIVER_CATEGORIES,
    IMPULSE_EDUCATION_TYPES,
    IMPULSE_FITNESS,
    IMPULSE_INSTITUTION_TYPES,
    IMPULSE_MARITAL_STATUSES,
    IMPULSE_MILITARY_COURSES,
    IMPULSE_MILITARY_EDUCATION_LEVELS,
    IMPULSE_PASSPORT_TYPES,
    IMPULSE_RANKS,
    IMPULSE_SERVICE_TYPES,
    IMPULSE_STUDY_FORMS,
    IMPULSE_TRACTOR_CATEGORIES,
} from '../../../../shared/personnel/impulseDictionaries';
import {
    clean,
    dictionaryValue,
    firstMatch,
    FITNESS,
    impulseAddress,
    impulseBloodType,
    impulseDocument,
    impulseDriverLicence,
    impulseGender,
    impulseOrder,
    impulsePassport,
    impulseRank,
    impulseTaxId,
    isDrillOrder,
    MARITAL,
    orNull,
    parseDate,
    SERVICE_TYPES,
    splitFullName,
} from '../../../../shared/personnel/recognize';
import type { EducationEntry, RelativeContact, User } from '../../../../shared/types/user';

// The recognisers are shared with the card («Розпізнати»); the export and its tests use them.
export {
    impulseAddress,
    impulseBloodType,
    impulseDocument,
    impulseDriverLicence,
    impulseGender,
    impulseOrder,
    impulsePassport,
    impulseRank,
    impulseTaxId,
    parseDate,
    splitFullName,
};
export { IMPULSE_RANKS };

/**
 * «Імпульс» export: the personnel import form of Impulse Toolkit (Додаток 1 «Особовий склад»,
 * Додаток 2 «Освіта і курси») filled from the cards.
 *
 * Impulse finds a card by surname + first name (+ patronymic + РНОКПП) and then OVERWRITES its
 * fields with what the file holds. A wrong value would spoil a correct card there, so a column
 * is filled only when the value is sure: a field of the Impulse card filled in PManager, or a
 * value recognised for sure in the free text older cards hold (a date, a document number, a
 * value of Impulse's own dictionary). Everything else stays empty in the form and goes, as
 * written in PManager, into the information columns at the end, which Impulse ignores.
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
    col(IMPULSE_INFO_GROUP, 'Нагороди (як у PManager)', 40),
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

// ---------------------------------------------------------------- helpers

const filled = (...values: unknown[]) => values.some((value) => clean(value) !== '');

/** Several dictionary values separated by commas («B,C1»): only the known ones, in order. */
function multiValue(value: unknown, dictionary: readonly string[]): string | null {
    const known = clean(value)
        .toUpperCase()
        .split(/[\s,;]+/)
        .filter((token) => dictionary.includes(token))
        .filter((token, index, all) => all.indexOf(token) === index);
    return known.length ? known.join(',') : null;
}

type Doc = {
    series: string | null;
    number: string | null;
    date: Date | null;
    issuer: string | null;
};

/**
 * A document of the card: its own fields when any of them is filled, otherwise what the free
 * text says. Never a mix of the two — they may describe different documents.
 */
function documentOf(fields: Record<keyof Doc, unknown>, fallback: () => Doc): Doc {
    if (!filled(...Object.values(fields))) return fallback();
    return {
        series: orNull(clean(fields.series)),
        number: orNull(clean(fields.number)),
        date: parseDate(fields.date),
        issuer: orNull(clean(fields.issuer)),
    };
}

type Address = ReturnType<typeof impulseAddress>;

function addressOf(user: User, prefix: 'reg' | 'live', text: unknown): Address {
    const part = (name: string) => (user as Record<string, unknown>)[`${prefix}${name}`];
    const parts = [
        'Region',
        'District',
        'Settlement',
        'CityDistrict',
        'StreetType',
        'Street',
        'House',
        'Flat',
    ];
    if (!filled(...parts.map(part))) return impulseAddress(text);
    return {
        region: orNull(clean(part('Region'))),
        district: orNull(clean(part('District'))),
        settlement: orNull(clean(part('Settlement'))),
        cityDistrict: orNull(clean(part('CityDistrict'))),
        streetType: orNull(clean(part('StreetType'))),
        street: orNull(clean(part('Street'))),
        house: orNull(clean(part('House'))),
        flat: orNull(clean(part('Flat'))),
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
    const passportText = impulsePassport(user.passportData);
    const passportOwn = filled(
        user.passportType,
        user.passportSeries,
        user.passportNumber,
        user.passportIssuer,
        user.passportIssueDate,
    );
    const passport = passportOwn
        ? {
              issuer: orNull(user.passportIssuer),
              date: parseDate(user.passportIssueDate),
              series: orNull(user.passportSeries),
              number: orNull(user.passportNumber),
              type: dictionaryValue(user.passportType, IMPULSE_PASSPORT_TYPES),
          }
        : passportText;
    const ticket = documentOf(
        {
            series: user.militaryTicketSeries,
            number: user.militaryTicketNumber,
            date: user.militaryTicketIssueDate,
            issuer: user.militaryTicketIssuer,
        },
        () => impulseDocument(user.militaryTicketInfo),
    );
    const ubd = documentOf(
        {
            series: user.ubdSeries,
            number: user.ubdNumber,
            date: user.ubdIssueDate,
            issuer: user.ubdIssuer,
        },
        () => impulseDocument(user.participantNumber || user.ubdStatus),
    );
    const driverOwn = filled(
        user.driverLicenseCategories,
        user.driverLicenseSeries,
        user.driverLicenseNumber,
        user.driverLicenseIssuer,
        user.driverLicenseIssueDate,
        user.driverLicenseValidUntil,
        user.drivingExperience,
    );
    const driverText = impulseDriverLicence(user.driverLicenses);
    const registered = addressOf(user, 'reg', user.registeredAddress);
    const living = addressOf(user, 'live', user.residenceAddress);

    const rankOwn = filled(user.rankOrderNumber, user.rankOrderIssuer);
    const rankOrder = rankOwn
        ? { date: null, number: orNull(user.rankOrderNumber), issuer: orNull(user.rankOrderIssuer) }
        : impulseOrder(user.rankAssignedBy);
    const ordersOwn = filled(
        user.appointmentOrderDate,
        user.appointmentOrderNumber,
        user.appointmentOrderIssuer,
        user.drillOrderDate,
        user.drillOrderNumber,
        user.drillOrderIssuer,
    );
    const legacyOrder = impulseOrder(user.appointmentOrder);
    const drill = isDrillOrder(user.appointmentOrder);
    const staffOrder = ordersOwn
        ? {
              date: parseDate(user.appointmentOrderDate),
              number: orNull(user.appointmentOrderNumber),
              issuer: orNull(user.appointmentOrderIssuer),
          }
        : drill
          ? { date: null, number: null, issuer: null }
          : legacyOrder;
    const drillOrder = ordersOwn
        ? {
              date: parseDate(user.drillOrderDate),
              number: orNull(user.drillOrderNumber),
              issuer: orNull(user.drillOrderIssuer),
          }
        : drill
          ? legacyOrder
          : { date: null, number: null, issuer: null };

    const relatives = family(user);
    // «Призов» is where the person was called up; «облік» where they are registered. Older
    // cards have only one office: it is the one that called them up.
    const calledUpBy = orNull(user.recruitmentOfficeDetails) ?? orNull(user.recruitingOffice);
    const registeredAt = orNull(user.recruitmentOfficeDetails)
        ? orNull(user.recruitingOffice)
        : null;

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
        orNull(user.foreignPassportIssuer),
        parseDate(user.foreignPassportIssueDate),
        orNull(user.foreignPassportNumber),
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
        orNull(user.iban)?.replace(/\s+/g, '') ?? null,
        orNull(user.bankCard)?.replace(/\s+/g, '') ?? null,
        orNull(user.bankName),
        // Посвідчення водія
        driverOwn ? orNull(user.driverLicenseIssuer) : null,
        driverOwn
            ? multiValue(user.driverLicenseCategories, IMPULSE_DRIVER_CATEGORIES)
            : driverText.categories,
        driverOwn ? parseDate(user.driverLicenseValidUntil) : null,
        driverOwn ? parseDate(user.driverLicenseIssueDate) : null,
        driverOwn ? orNull(user.drivingExperience) : null,
        driverOwn ? orNull(user.driverLicenseSeries) : driverText.series,
        driverOwn ? orNull(user.driverLicenseNumber) : driverText.number,
        // Посвідчення тракториста-машиніста
        orNull(user.tractorLicenseIssuer),
        multiValue(user.tractorLicenseCategories, IMPULSE_TRACTOR_CATEGORIES),
        parseDate(user.tractorLicenseValidUntil),
        parseDate(user.tractorLicenseIssueDate),
        orNull(user.tractorExperience),
        orNull(user.tractorLicenseSeries),
        orNull(user.tractorLicenseNumber),
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
        orNull(user.phoneNumber),
        orNull(user.extraPhone),
        orNull(user.email),
        // Наказ на присвоєння звання
        impulseRank(user.rank),
        parseDate(user.rankAssignmentDate) ?? rankOrder.date,
        rankOrder.number,
        rankOrder.issuer,
        // Наказ на призначення (по особовому складу)
        staffOrder.date,
        staffOrder.number,
        staffOrder.issuer,
        // Наказ на призначення (по стройовій частині)
        drillOrder.date,
        drillOrder.number,
        drillOrder.issuer,
        // БЗВП
        parseDate(user.bzvpFrom),
        parseDate(user.bzvpTo),
        orNull(user.bzvpPlace),
        orNull(user.bzvpCommander),
        orNull(user.bzvpComment),
        // Персональна інформація
        dictionaryValue(user.citizenship, IMPULSE_CITIZENSHIPS),
        dictionaryValue(user.birthCountry, IMPULSE_COUNTRIES),
        orNull(user.placeOfBirth),
        dictionaryValue(user.maritalStatus, IMPULSE_MARITAL_STATUSES, MARITAL),
        orNull(user.nationality),
        orNull(user.religion),
        orNull(user.tags),
        // Вчене звання
        dictionaryValue(user.academicTitle, IMPULSE_ACADEMIC_TITLES),
        orNull(user.academicTitleAssignedBy),
        parseDate(user.academicTitleDate),
        orNull(user.scientificWorks),
        // Виборчі органи
        orNull(user.electedBody),
        parseDate(user.electedDate),
        parseDate(user.electedUntil),
        orNull(user.electedPosition),
        // Медична інформація
        impulseBloodType(user.bloodType),
        // Проходження служби
        dictionaryValue(user.fitnessCategory, IMPULSE_FITNESS, FITNESS),
        parseDate(user.oathDate),
        orNull(user.militaryServiceHistory),
        dictionaryValue(user.serviceType, IMPULSE_SERVICE_TYPES, SERVICE_TYPES),
        parseDate(user.conscriptionDate),
        parseDate(user.enlistmentOrderDate),
        orNull(user.enlistmentOrderNumber),
        calledUpBy,
        registeredAt,
        // Вислуга
        parseDate(user.serviceLengthDate),
        orNull(user.serviceLength),
        parseDate(user.preferentialServiceLengthDate),
        orNull(user.preferentialServiceLength),
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
        orNull(awardsSummary(user.awardRecords)) ?? orNull(user.awards),
    ];
    return [...form, ...info];
}

const EDUCATION_LEVELS: [RegExp, string][] = [
    [/неповн\S*\s+вищ|бакалавр\s+молодш|молодш\S*\s+спеціаліст/i, 'Неповна вища'],
    [/вищ|магістр|спеціаліст|університет|академі|інститут/i, 'Вища'],
    [/профес|пту|ліце|технікум|коледж|училищ/i, 'Професійно-технічна'],
    [/середн|школ|загальн/i, 'Середня загальна'],
];

/** One line of Додаток 2 from an education entry of the card. */
function educationEntryRow(user: User, entry: EducationEntry): ImpulseValue[] {
    const type = dictionaryValue(entry.type, IMPULSE_EDUCATION_TYPES);
    const levels =
        type === 'Військова' ? IMPULSE_MILITARY_EDUCATION_LEVELS : IMPULSE_CIVIL_EDUCATION_LEVELS;
    return [
        clean(user.fullName),
        impulseTaxId(user),
        type,
        dictionaryValue(entry.level, levels),
        dictionaryValue(entry.form, IMPULSE_STUDY_FORMS),
        dictionaryValue(entry.courses, IMPULSE_MILITARY_COURSES),
        orNull(entry.institution),
        dictionaryValue(entry.institutionType, IMPULSE_INSTITUTION_TYPES),
        orNull(entry.specialty),
        orNull(entry.startYear),
        orNull(entry.endYear),
        orNull(entry.comment),
    ];
}

/** Lines of Додаток 2: the education entries of the card, or what its free text says. */
export function impulseEducationRows(user: User): ImpulseValue[][] {
    const entries = (Array.isArray(user.educationList) ? user.educationList : []).filter((entry) =>
        filled(
            entry.type,
            entry.level,
            entry.institution,
            entry.specialty,
            entry.endYear,
            entry.courses,
        ),
    );
    if (entries.length) return entries.map((entry) => educationEntryRow(user, entry));
    const legacy = impulseEducationRow(user);
    return legacy ? [legacy] : [];
}

/** A row of Додаток 2 from the free text of older cards, or null. */
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
    const filledCount = Object.fromEntries(IMPULSE_CHECKS.map((c) => [c.key, 0])) as Record<
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
            if (ok) filledCount[check.key]++;
            return !ok;
        }).map((check) => check.key);
        if (missing.length) gaps.push({ user, missing });
    }
    return { people: people.length, filled: filledCount, gaps };
}
