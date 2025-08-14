// src/renderer/shared/utils/plannedTotalsFromShtatni.ts
export type PlannedTotals = Record<string, { total: number; officer: number; soldier: number }>;

function normalizeUnit(n: string) {
    return (n || '')
        .toLowerCase()
        .replace(/\n/g, ' ')
        .replace(/-й/g, '') // "1-й взвод" → "1 взвод"
        .replace(/-/g, ' ') // "1-взвод" → "1 взвод"
        .replace(/\s+/g, ' ')
        .trim();
}

function isOfficer(category?: string) {
    const c = (category || '').toLowerCase();
    return c.includes('оф') || c.includes('офіц'); // tune if needed
}

// Optional: direct aliases for exact normalized strings
const ALIAS: Record<string, string> = {
    'управління роти': 'Управління роти',
    '1 взвод': '1-й взвод',
    '2 взвод': '2-й взвод',
    '3 взвод': '3-й взвод',
};

// Extract platoon number (1,2,3,...) from a messy unit string
function extractPlatoonNumber(n: string): number | null {
    // handles: "1 взвод", "1-взвод", "1й взвод", "взводу 1", etc.
    const m =
        n.match(/(^|\s)(\d+)\s*(?:й)?\s*взвод/u) || // "1 взвод", "1й взвод"
        n.match(/взвод\s*(\d+)/u) || // "взвод 1"
        n.match(/(^|\s)(\d+)\s*[- ]?взвод/u); // "1-взвод"
    if (!m) return null;
    const num = Number(m[2] ?? m[1] ?? m[0]);
    return Number.isFinite(num) ? num : null;
}

/** Optional filter: exclude units that shouldn't count into planning */
function shouldCountUnit(unit: string) {
    const n = normalizeUnit(unit);
    if (n.includes('прикоманд')) return false; // "Прикомандировані"
    return !!n;
}

/** Canonicalize any unit string to our report keys ("Управління роти", "1-й взвод", ...) */
function canonicalUnit(raw: string): string {
    const n = normalizeUnit(raw);

    // direct map first
    if (ALIAS[n]) return ALIAS[n];

    // Any phrase that mentions "управління" + a platoon number → parent platoon
    if (n.includes('управління') && n.includes('взвод')) {
        const pl = extractPlatoonNumber(n);
        if (pl) return `${pl}-й взвод`;
    }

    // Any phrase that mentions "відділення"/"відділ" under a platoon → parent platoon
    if ((n.includes('відділення') || n.includes('відділ')) && n.includes('взвод')) {
        const pl = extractPlatoonNumber(n);
        if (pl) return `${pl}-й взвод`;
    }

    // Generic: any string that contains a platoon number → parent platoon
    {
        const pl = extractPlatoonNumber(n);
        if (pl) return `${pl}-й взвод`;
    }

    // Fallbacks for company HQ variants
    if (n.includes('управління') && n.includes('роти')) return 'Управління роти';

    // Fall back to original (title case is optional; we keep original casing from data)
    return raw.trim();
}

/** Turn state “штатні посади” → planned totals per unit */
export function buildPlannedTotalsFromShtatni(
    shtatniPosady: Array<{ unit_name?: string; category?: string }>,
): PlannedTotals {
    const map: PlannedTotals = {};

    for (const pos of shtatniPosady) {
        const rawUnit = (pos.unit_name || '').trim();
        if (!rawUnit || !shouldCountUnit(rawUnit)) continue;

        const key = canonicalUnit(rawUnit);
        if (!map[key]) map[key] = { total: 0, officer: 0, soldier: 0 };

        map[key].total += 1;
        if (isOfficer(pos.category)) map[key].officer += 1;
        else map[key].soldier += 1;
    }

    // Sum "ВСЬОГО"
    const total = Object.values(map).reduce(
        (acc, v) => {
            acc.total += v.total;
            acc.officer += v.officer;
            acc.soldier += v.soldier;
            return acc;
        },
        { total: 0, officer: 0, soldier: 0 },
    );

    map['ВСЬОГО'] = total;
    return map;
}
