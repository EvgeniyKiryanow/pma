/**
 * Columns of `users` that the application writes. SQL for inserts/updates is generated from
 * this list (never from keys of incoming objects), so it stays safe and in one place.
 * When a new personnel field is added: add a migration with the column, then add it here.
 */
export const USER_JSON_FIELDS = ['relatives', 'comments', 'history'] as const;

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
        if (field === 'hasCriminalRecord') return value ? 1 : 0;
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
