// helpers/csvImports.ts

/** ✅ Convert Excel serial date → YYYY-MM-DD */
export function excelSerialToDate(serial: number): string {
    if (!serial || isNaN(serial)) return '';

    // Excel's base date (Dec 30, 1899)
    const excelEpoch = new Date(1899, 11, 30);
    const result = new Date(excelEpoch.getTime() + serial * 86400000);

    if (isNaN(result.getTime())) return '';

    return result.toISOString().split('T')[0]; // YYYY-MM-DD
}

/** ✅ Normalize various Excel date formats → YYYY-MM-DD */
export function normalizeExcelDate(raw: any): string {
    if (!raw) return '';

    // Case 1: Excel serial number
    if (!isNaN(Number(raw)) && Number(raw) > 10000 && Number(raw) < 60000) {
        return excelSerialToDate(Number(raw));
    }

    // Case 2: Already JS Date
    if (raw instanceof Date) {
        return raw.toISOString().split('T')[0];
    }

    const str = String(raw).trim();

    // Case 3: dd/MM/yy → try parse
    const parts = str.split(/[./-]/).map((p) => p.trim());
    if (parts.length >= 3) {
        // eslint-disable-next-line prefer-const
        let [dd, mm, yy] = parts;

        if (parseInt(dd) > 12 && parseInt(mm) <= 12) [dd, mm] = [mm, dd];

        let fullYear = parseInt(yy, 10);
        if (yy.length === 2) {
            fullYear = parseInt(yy, 10) <= 30 ? 2000 + parseInt(yy) : 1900 + parseInt(yy);
        }

        const d = new Date(fullYear, parseInt(mm) - 1, parseInt(dd));
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }

    // Case 4: already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

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
