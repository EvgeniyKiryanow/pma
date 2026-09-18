import { currentStatusName, STATUS_COLUMNS } from '../../shared/helpers/statusNames';

const STATUS_FIELDS = new Set<string>(STATUS_COLUMNS);

/**
 * Columns of `users` that the application writes. SQL for inserts/updates is generated from
 * this list (never from keys of incoming objects), so it stays safe and in one place.
 * When a new personnel field is added: add a migration with the column, then add it here.
 */
export const USER_JSON_FIELDS = [
    'relatives',
    'comments',
    'history',
    'educationList',
    'awardRecords',
] as const;

export const USER_WRITABLE_FIELDS = [
    'fullName',
    'photo',
    'phoneNumber',
    'email',
    'dateOfBirth',
    'position',
    'rank',
    'rights',
    'conscriptionInfo',
    'notes',
    'relatives',
    'comments',
    'history',
    'education',
    'awards',
    'callsign',
    'passportData',
    'participantNumber',
    'identificationNumber',
    'fitnessCategory',
    'unitNumber',
    'hasCriminalRecord',
    'criminalRecordDetails',
    'militaryTicketInfo',
    'militaryServiceHistory',
    'civilProfession',
    'educationDetails',
    'residenceAddress',
    'registeredAddress',
    'healthConditions',
    'maritalStatus',
    'familyInfo',
    'religion',
    'recruitingOffice',
    'driverLicenses',
    'bloodType',
    'unitMain',
    'unitLevel1',
    'unitLevel2',
    'platoon',
    'squad',
    'vosCode',
    'shpkCode',
    'shpkNumber',
    'category',
    'kshp',
    'rankAssignedBy',
    'rankAssignmentDate',
    'appointmentOrder',
    'previousStatus',
    'placeOfBirth',
    'taxId',
    'serviceType',
    'recruitmentOfficeDetails',
    'ubdStatus',
    'childrenInfo',
    'bzvpStatus',
    'rvbzPresence',
    'absenceReason',
    'absenceFromDate',
    'absenceToDate',
    'subordination',
    'gender',
    'personalPrisonFileExists',
    'tDotData',
    'positionNominative',
    'positionGenitive',
    'positionDative',
    'positionInstrumental',
    'soldierStatus',
    'isAttached',
    'attachedFrom',
    'passportType',
    'passportSeries',
    'passportNumber',
    'passportIssuer',
    'passportIssueDate',
    'foreignPassportNumber',
    'foreignPassportIssuer',
    'foreignPassportIssueDate',
    'militaryTicketSeries',
    'militaryTicketNumber',
    'militaryTicketIssuer',
    'militaryTicketIssueDate',
    'ubdSeries',
    'ubdNumber',
    'ubdIssuer',
    'ubdIssueDate',
    'driverLicenseCategories',
    'driverLicenseSeries',
    'driverLicenseNumber',
    'driverLicenseIssuer',
    'driverLicenseIssueDate',
    'driverLicenseValidUntil',
    'drivingExperience',
    'tractorLicenseCategories',
    'tractorLicenseSeries',
    'tractorLicenseNumber',
    'tractorLicenseIssuer',
    'tractorLicenseIssueDate',
    'tractorLicenseValidUntil',
    'tractorExperience',
    'iban',
    'bankCard',
    'bankName',
    'regRegion',
    'regDistrict',
    'regSettlement',
    'regCityDistrict',
    'regStreetType',
    'regStreet',
    'regHouse',
    'regFlat',
    'liveRegion',
    'liveDistrict',
    'liveSettlement',
    'liveCityDistrict',
    'liveStreetType',
    'liveStreet',
    'liveHouse',
    'liveFlat',
    'extraPhone',
    'citizenship',
    'birthCountry',
    'nationality',
    'tags',
    'rankOrderNumber',
    'rankOrderIssuer',
    'appointmentOrderDate',
    'appointmentOrderNumber',
    'appointmentOrderIssuer',
    'drillOrderDate',
    'drillOrderNumber',
    'drillOrderIssuer',
    'bzvpFrom',
    'bzvpTo',
    'bzvpPlace',
    'bzvpCommander',
    'bzvpComment',
    'academicTitle',
    'academicTitleAssignedBy',
    'academicTitleDate',
    'scientificWorks',
    'electedBody',
    'electedDate',
    'electedUntil',
    'electedPosition',
    'oathDate',
    'conscriptionDate',
    'enlistmentOrderDate',
    'enlistmentOrderNumber',
    'serviceLengthDate',
    'serviceLength',
    'preferentialServiceLengthDate',
    'preferentialServiceLength',
    'educationList',
    'awardRecords',
] as const;

export type UserWritableField = (typeof USER_WRITABLE_FIELDS)[number];

const JSON_FIELDS = new Set<string>(USER_JSON_FIELDS);

/** Converts a renderer user object into bind values, in the order of `fields`. */
export function userToRow(
    user: Record<string, unknown>,
    fields: readonly string[] = USER_WRITABLE_FIELDS,
): unknown[] {
    return fields.map((field) => {
        const value = user[field];
        if (JSON_FIELDS.has(field)) return JSON.stringify(value || []);
        if (field === 'hasCriminalRecord' || field === 'isAttached') return value ? 1 : 0;
        // An old spelling from Excel or an older version is stored under the current name.
        if (STATUS_FIELDS.has(field)) return currentStatusName(value);
        return value;
    });
}

export function parseUserRow<T extends Record<string, any>>(
    row: T,
    fields: readonly string[] = USER_JSON_FIELDS,
): T {
    const result: Record<string, unknown> = { ...row };
    for (const field of fields) result[field] = safeJsonArray(row[field]);
    return result as T;
}

export function safeJsonArray(value: unknown): unknown[] {
    if (typeof value !== 'string' || !value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}
