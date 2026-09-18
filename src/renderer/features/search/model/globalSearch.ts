import type { AwardDef } from '../../../../shared/awards/catalog';
import type { DirectiveRecord } from '../../../../shared/types/directive';
import type { ReportTemplateRecord } from '../../../../shared/types/reports';
import type { ShtatnaPosada } from '../../../../shared/types/shtatnaPosada';
import type { User } from '../../../../shared/types/user';
import type { TabKey } from '../../../app/tabKeys';

/**
 * The global search: one query over people, staff positions, awards, saved reports,
 * templates, orders and the sections of the program. Pure — the window feeds it what the
 * current role may read.
 */

export const SEARCH_CATEGORIES = [
    'people',
    'positions',
    'awards',
    'orders',
    'reports',
    'templates',
    'sections',
] as const;

export type SearchCategory = (typeof SEARCH_CATEGORIES)[number];

export type SearchAction =
    | { type: 'person'; userId: number }
    | { type: 'position'; shtatNumber: string; holderId?: number }
    | { type: 'award'; awardId: string }
    | { type: 'order'; userId: number }
    | { type: 'report'; recordId: number; name: string }
    | { type: 'template'; templateId: string; name: string }
    | { type: 'tab'; tab: TabKey }
    | { type: 'command'; command: 'add-person' };

export type SearchHit = {
    key: string;
    category: SearchCategory;
    title: string;
    subtitle?: string;
    /** The field that matched when it is not the title: «ІПН: 3012345678». */
    matched?: { label: string; value: string };
    score: number;
    action: SearchAction;
    /** People: for the avatar; awards: for the insignia. */
    userId?: number;
    awardId?: string;
};

export type SearchSection = {
    key: string;
    label: string;
    /** Words people type for it: «excel», «імпорт», «табель»… */
    keywords?: string;
    action: SearchAction;
};

export type SearchSources = {
    users?: User[];
    positions?: ShtatnaPosada[];
    awards?: { award: AwardDef; holders: number }[];
    orders?: DirectiveRecord[];
    reports?: ReportTemplateRecord[];
    templates?: { id: string; name: string; source: 'bundled' | 'uploaded' }[];
    sections?: SearchSection[];
};

/** Field labels for «matched in»; the window passes the translated ones. */
export type FieldLabel = (field: string) => string;

// ------------------------------------------------------------------------ text

/** Lower case, no quotes or apostrophes, one space: «Орден «За мужність»» → «орден за мужність». */
export function normalize(text: unknown): string {
    return String(text ?? '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[«»"'’ʼ`„“”]/g, '')
        .replace(/[\s,;]+/g, ' ')
        .trim();
}

export const digitsOf = (text: unknown) => String(text ?? '').replace(/\D/g, '');

const LATIN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const UKRAINIAN = 'йцукенгшщзхїфівапролджєячсмитьбюʼ';
const LAYOUT = new Map([...LATIN].map((ch, i) => [ch, UKRAINIAN[i]]));

/**
 * The text as if it had been typed with the Ukrainian layout: «Ivfnrj» → «шмфтко». Null when
 * nothing changes (no Latin letters).
 */
export function fromLatinLayout(text: string): string | null {
    if (!/[a-z[\];',.`]/i.test(text)) return null;
    const converted = [...text.toLowerCase()].map((ch) => LAYOUT.get(ch) ?? ch).join('');
    return converted === text.toLowerCase() ? null : converted;
}

type Token = { text: string; digits: string };

function tokenize(query: string): Token[] {
    // A number typed in groups («050 123 45 67», «30 1234 5678») is one number: phones and
    // tax numbers are stored in any format.
    if (/^[\d\s+\-()./]+$/.test(query.trim()) && digitsOf(query).length >= 3) {
        const digits = digitsOf(query);
        return [{ text: digits, digits }];
    }
    return normalize(query)
        .split(' ')
        .filter(Boolean)
        .map((text) => ({ text, digits: /^[\d+\-()/.\s]+$/.test(text) ? digitsOf(text) : '' }));
}

// ------------------------------------------------------------------------ scoring

type Field = { name: string; value: unknown; weight: number; digits?: boolean };

/** How well one word matches one field: whole word > start of a word > anywhere. */
function wordScore(token: Token, field: Field, text: string): number {
    if (token.digits.length >= 3 && field.digits) {
        const digits = digitsOf(field.value);
        if (digits === token.digits) return 12 * field.weight;
        if (digits.includes(token.digits)) return 5 * field.weight;
    }
    if (!text) return 0;
    const at = text.indexOf(token.text);
    if (at < 0) return 0;
    const startsWord = at === 0 || /[\s\-/.(№]/.test(text[at - 1]);
    const end = at + token.text.length;
    const endsWord = end === text.length || /[\s\-/.),]/.test(text[end]);
    if (startsWord && endsWord) return 10 * field.weight;
    if (startsWord) return 6 * field.weight;
    // Short fragments in the middle of words are noise («ко» in half the surnames).
    return token.text.length >= 3 ? 2 * field.weight : 0;
}

type Scored = { score: number; best?: Field };

/** Every word must match some field (AND); the score adds up the best match of each word. */
function scoreFields(tokens: Token[], fields: Field[]): Scored | null {
    const texts = fields.map((field) => normalize(field.value));
    let score = 0;
    let best: Field | undefined;
    let bestScore = 0;
    for (const token of tokens) {
        let tokenBest = 0;
        let tokenField: Field | undefined;
        fields.forEach((field, i) => {
            const s = wordScore(token, field, texts[i]);
            if (s > tokenBest) {
                tokenBest = s;
                tokenField = field;
            }
        });
        if (!tokenBest) return null;
        score += tokenBest;
        if (tokenField && tokenBest > bestScore) {
            bestScore = tokenBest;
            best = tokenField;
        }
    }
    return { score, best };
}

/** Tries the query as typed and, when it has Latin letters, as typed on the Ukrainian layout. */
function bestOf(queries: Token[][], fields: Field[]): Scored | null {
    let result: Scored | null = null;
    queries.forEach((tokens, i) => {
        const scored = scoreFields(tokens, fields);
        // The layout guess counts a little less than what was typed.
        if (scored && i > 0) scored.score *= 0.9;
        if (scored && (!result || scored.score > result.score)) result = scored;
    });
    return result;
}

// ------------------------------------------------------------------------ sources

/** People: identity first, then post and documents, then everything else in the card. */
const PERSON_FIELDS: { name: keyof User | string; weight: number; digits?: boolean }[] = [
    { name: 'fullName', weight: 6 },
    { name: 'callsign', weight: 6 },
    { name: 'shpkNumber', weight: 4, digits: true },
    { name: 'position', weight: 4 },
    { name: 'rank', weight: 3 },
    { name: 'taxId', weight: 5, digits: true },
    { name: 'identificationNumber', weight: 5, digits: true },
    { name: 'phoneNumber', weight: 5, digits: true },
    { name: 'extraPhone', weight: 4, digits: true },
    { name: 'unitMain', weight: 3 },
    { name: 'unitLevel1', weight: 3 },
    { name: 'unitLevel2', weight: 3 },
    { name: 'platoon', weight: 3 },
    { name: 'squad', weight: 3 },
    { name: 'soldierStatus', weight: 3 },
    { name: 'tags', weight: 3 },
    { name: 'militaryTicketNumber', weight: 4, digits: true },
    { name: 'passportNumber', weight: 4, digits: true },
    { name: 'ubdNumber', weight: 4, digits: true },
    { name: 'dateOfBirth', weight: 3, digits: true },
    { name: 'vosCode', weight: 2 },
    { name: 'category', weight: 1 },
];

const PERSON_FIELD_NAMES = new Set(PERSON_FIELDS.map((field) => field.name));
/** Never searched: pictures, JSON of other features, internal columns. */
const SKIPPED = new Set([
    'id',
    'uuid',
    'photo',
    'history',
    'comments',
    'relatives',
    'educationList',
    'awardRecords',
    'created_at',
    'updated_at',
    'createdAt',
    'updatedAt',
    'shtatNumber',
]);

function personFields(user: User, awardTitles: (user: User) => string[]): Field[] {
    const record = user as unknown as Record<string, unknown>;
    const fields: Field[] = PERSON_FIELDS.map((field) => ({
        name: String(field.name),
        value: record[field.name as string],
        weight: field.weight,
        digits: field.digits,
    })).filter((field) => field.value !== undefined && field.value !== null && field.value !== '');
    // Everything else written in the card (addresses, notes, documents…) — found, but last.
    for (const [name, value] of Object.entries(record)) {
        if (PERSON_FIELD_NAMES.has(name) || SKIPPED.has(name)) continue;
        if (typeof value !== 'string' || !value.trim() || value.length > 2000) continue;
        fields.push({
            name,
            value,
            weight: 1,
            digits: /number|phone|series|iban|card|date/i.test(name),
        });
    }
    const relatives = Array.isArray(user.relatives) ? user.relatives : [];
    for (const relative of relatives) {
        const r = relative as unknown as Record<string, unknown>;
        const text = [r.name, r.relationship, r.phone].filter(Boolean).join(' ');
        if (text) fields.push({ name: 'relatives', value: text, weight: 1, digits: true });
    }
    // Dates are kept as 1990-05-01 and typed as 01.05.1990.
    const born = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(user.dateOfBirth ?? ''));
    if (born) {
        fields.push({
            name: 'dateOfBirth',
            value: `${born[3]}.${born[2]}.${born[1]}`,
            weight: 3,
            digits: true,
        });
    }
    for (const title of awardTitles(user)) fields.push({ name: 'awards', value: title, weight: 1 });
    return fields;
}

const snippet = (value: unknown) => {
    const text = String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim();
    return text.length > 90 ? `${text.slice(0, 87)}…` : text;
};

const TITLE_FIELDS = new Set(['fullName']);

/**
 * Runs the query over every source. Results are sorted by score inside each category;
 * `limit` caps each category.
 */
export function globalSearch(
    query: string,
    sources: SearchSources,
    options: {
        fieldLabel: FieldLabel;
        awardTitles?: (user: User) => string[];
        orderTypeLabel?: (type: DirectiveRecord['type']) => string;
        limit?: number;
    },
): SearchHit[] {
    const tokens = tokenize(query);
    if (!tokens.length) return [];
    const layout = fromLatinLayout(query.toLowerCase());
    const queries = layout ? [tokens, tokenize(layout)] : [tokens];
    const limit = options.limit ?? 50;
    const hits: SearchHit[] = [];
    const push = (list: SearchHit[]) =>
        hits.push(...list.sort((a, b) => b.score - a.score).slice(0, limit));

    const users = sources.users ?? [];
    const byId = new Map(users.map((user) => [user.id, user]));
    const byStaffNumber = new Map(
        users
            .filter((user) => user.shpkNumber)
            .map((user) => [String(user.shpkNumber).trim(), user]),
    );

    // People
    push(
        users.flatMap((user): SearchHit[] => {
            const scored = bestOf(queries, personFields(user, options.awardTitles ?? (() => [])));
            if (!scored) return [];
            const best = scored.best;
            return [
                {
                    key: `person:${user.id}`,
                    category: 'people',
                    title: user.fullName || '—',
                    subtitle: [user.rank, user.position, user.soldierStatus]
                        .filter(Boolean)
                        .join(' · '),
                    matched:
                        best && !TITLE_FIELDS.has(best.name)
                            ? { label: options.fieldLabel(best.name), value: snippet(best.value) }
                            : undefined,
                    // Excluded people go below the serving ones with the same match.
                    score: scored.score * (user.shpkNumber === 'excluded' ? 0.6 : 1),
                    action: { type: 'person', userId: user.id },
                    userId: user.id,
                },
            ];
        }),
    );

    // Staff positions (БЧС)
    push(
        (sources.positions ?? []).flatMap((position): SearchHit[] => {
            const number = String(position.shtat_number ?? '').trim();
            const holder = byStaffNumber.get(number);
            const scored = bestOf(queries, [
                { name: 'shtat_number', value: number, weight: 5, digits: true },
                { name: 'position_name', value: position.position_name, weight: 4 },
                { name: 'unit_name', value: position.unit_name, weight: 3 },
                { name: 'shpk_code', value: position.shpk_code, weight: 2 },
                { name: 'category', value: position.category, weight: 1 },
                { name: 'holder', value: holder?.fullName, weight: 3 },
            ]);
            if (!scored) return [];
            return [
                {
                    key: `position:${number}`,
                    category: 'positions',
                    title: `№ ${number} · ${position.position_name || '—'}`,
                    subtitle: [position.unit_name, holder ? holder.fullName : null]
                        .filter(Boolean)
                        .join(' · '),
                    score: scored.score,
                    action: { type: 'position', shtatNumber: number, holderId: holder?.id },
                    userId: holder?.id,
                },
            ];
        }),
    );

    // Awards of the register
    push(
        (sources.awards ?? []).flatMap(({ award, holders }): SearchHit[] => {
            const scored = bestOf(queries, [
                { name: 'name', value: award.name, weight: 4 },
                { name: 'body', value: award.body, weight: 3 },
                { name: 'awardedBy', value: award.awardedBy, weight: 1 },
                { name: 'established', value: award.established, weight: 1 },
            ]);
            if (!scored) return [];
            return [
                {
                    key: `award:${award.id}`,
                    category: 'awards',
                    title: award.name,
                    subtitle: [award.body, award.awardedBy].filter(Boolean).join(' · '),
                    // Awards somebody holds come first.
                    score: scored.score + Math.min(holders, 5),
                    action: { type: 'award', awardId: award.id },
                    awardId: award.id,
                    matched: holders ? { label: '', value: String(holders) } : undefined,
                },
            ];
        }),
    );

    // Orders, exclusions, restorations
    push(
        (sources.orders ?? []).flatMap((order): SearchHit[] => {
            const person = byId.get(order.userId);
            const scored = bestOf(queries, [
                { name: 'title', value: order.title, weight: 4 },
                { name: 'description', value: order.description, weight: 2 },
                { name: 'person', value: person?.fullName, weight: 3 },
                { name: 'date', value: order.date, weight: 2 },
            ]);
            if (!scored) return [];
            return [
                {
                    key: `order:${order.id}`,
                    category: 'orders',
                    title: order.title || '—',
                    subtitle: [
                        options.orderTypeLabel?.(order.type),
                        person?.fullName,
                        order.date?.slice(0, 10),
                    ]
                        .filter(Boolean)
                        .join(' · '),
                    score: scored.score,
                    action: { type: 'order', userId: order.userId },
                    userId: order.userId,
                },
            ];
        }),
    );

    // Saved reports
    push(
        (sources.reports ?? []).flatMap((report): SearchHit[] => {
            const scored = bestOf(queries, [{ name: 'name', value: report.name, weight: 4 }]);
            if (!scored) return [];
            return [
                {
                    key: `report:${report.id}`,
                    category: 'reports',
                    title: report.name,
                    subtitle: report.createdAt
                        ? new Date(report.createdAt).toLocaleDateString('uk-UA')
                        : undefined,
                    score: scored.score,
                    action: { type: 'report', recordId: report.id, name: report.name },
                },
            ];
        }),
    );

    // Templates
    push(
        (sources.templates ?? []).flatMap((template): SearchHit[] => {
            const scored = bestOf(queries, [{ name: 'name', value: template.name, weight: 4 }]);
            if (!scored) return [];
            return [
                {
                    key: `template:${template.id}`,
                    category: 'templates',
                    title: template.name,
                    score: scored.score,
                    action: { type: 'template', templateId: template.id, name: template.name },
                },
            ];
        }),
    );

    // Sections and actions of the program
    push(
        (sources.sections ?? []).flatMap((section): SearchHit[] => {
            const scored = bestOf(queries, [
                { name: 'label', value: section.label, weight: 5 },
                { name: 'keywords', value: section.keywords, weight: 3 },
            ]);
            if (!scored) return [];
            return [
                {
                    key: `section:${section.key}`,
                    category: 'sections',
                    title: section.label,
                    score: scored.score,
                    action: section.action,
                },
            ];
        }),
    );

    return hits;
}

/** Where the words of the query are in a text: ranges to highlight. */
export function highlightRanges(text: string, query: string): [number, number][] {
    const lower = text.toLowerCase().replace(/ё/g, 'е');
    const words = normalize(query).split(' ').filter(Boolean);
    const layout = fromLatinLayout(query.toLowerCase());
    if (layout) words.push(...normalize(layout).split(' ').filter(Boolean));
    const ranges: [number, number][] = [];
    for (const word of words) {
        let from = 0;
        for (;;) {
            const at = lower.indexOf(word, from);
            if (at < 0) break;
            ranges.push([at, at + word.length]);
            from = at + word.length;
        }
    }
    ranges.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const range of ranges) {
        const last = merged[merged.length - 1];
        if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
        else merged.push([...range]);
    }
    return merged;
}
