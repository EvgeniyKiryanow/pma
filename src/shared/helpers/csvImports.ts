// helpers/csvImports.ts

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Formats a date as YYYY-MM-DD from its UTC parts (no timezone shift). */
function formatUtc(year: number, month: number, day: number): string {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(date.getTime())) return '';
    // Reject overflowed values like month 15 or day 32.
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return '';
    }
    return date.toISOString().slice(0, 10);
}

/**
 * Excel serial date → YYYY-MM-DD.
 * Calculated in UTC on purpose: using local time shifted every imported date one day back
 * in timezones east of UTC (Kyiv is UTC+2/+3).
 */
export function excelSerialToDate(serial: number): string {
    const value = Number(serial);
    if (!value || isNaN(value) || value < 1) return '';

    // Excel counts days from 30.12.1899; fractional part is the time of day and is dropped.
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

function expandTwoDigitYear(year: number): number {
    return year <= 30 ? 2000 + year : 1900 + year;
}

/**
 * Normalizes what Excel can give for a date → YYYY-MM-DD: serial numbers, Date objects,
 * ISO strings and day-first strings ("15.03.2023", "15/03/23").
 * Unrecognized input is returned unchanged so nothing is silently corrupted.
 */
export function normalizeExcelDate(raw: any): string {
    if (raw === null || raw === undefined || raw === '') return '';

    if (raw instanceof Date) {
        return isNaN(raw.getTime())
            ? ''
            : formatUtc(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
    }

    const numeric = Number(raw);
    if (!isNaN(numeric) && numeric > 10000 && numeric < 60000) return excelSerialToDate(numeric);

    const str = String(raw).trim();

    const iso = ISO_DATE.exec(str);
    if (iso) return formatUtc(Number(iso[1]), Number(iso[2]), Number(iso[3])) || str;

    const parts = str.split(/[./\-\s]+/).filter(Boolean);
    if (parts.length >= 3 && parts.every((part) => /^\d+$/.test(part))) {
        let [first, second] = parts.map(Number);
        const third = Number(parts[2]);

        // Decide which number is the day: 13+ can only be a day, otherwise assume day-first.
        if (first <= 12 && second > 12) [first, second] = [second, first];

        const year = parts[2].length <= 2 ? expandTwoDigitYear(third) : third;
        const formatted = formatUtc(year, second, first);
        if (formatted) return formatted;
    }

    return str;
}

/** ✅ Generate a unique key for user matching */
export function generateUserKey(user: any): string {
    const name = (user.fullName || '').trim().toLowerCase();
    const dob = (user.dateOfBirth || '').trim();
    const taxId = (user.taxId || '').trim();
    const shpkNumber = (user.shpkNumber || '').trim();

    return `key_${name}_${dob}_${taxId}_${shpkNumber}`;
}

/** ✅ Detect if existing user needs update */
export function needsUpdate(existing: any, incoming: any): boolean {
    const keysToCompare = Object.keys(incoming);
    return keysToCompare.some(
        (key) =>
            incoming[key] !== undefined &&
            incoming[key] !== '' &&
            String(existing[key] || '').trim() !== String(incoming[key] || '').trim(),
    );
}
