import type { AwardRecord, AwardStatus } from '../types/user';

/**
 * Awards a service member of Ukraine can hold, as they are named in the acts that establish
 * them. Checked in September 2026 against:
 * - Закон України «Про державні нагороди України» № 1549-III (ред. 15.07.2026), ст. 3, 6–10;
 * - укази Президента про президентські відзнаки (зокрема № 559/2022 «За оборону України»);
 * - наказ Міністра оборони № 165 від 11.03.2013 у редакції наказу № 392 від 21.11.2022
 *   (відомчі заохочувальні відзнаки: нагрудні знаки, 28 медалей, заохочення);
 * - наказ Головнокомандувача ЗСУ № 411 від 23.12.2021 (почесні нагрудні знаки) зі змінами 2023.
 * Awards of other bodies (МВС, НГУ, ДПСУ, СБУ, ГУР, командувачів…) are written by hand as
 * «Інша нагорода» with «Від кого».
 *
 * Ids are stored in the cards: never change or reuse one.
 */

export type AwardKind =
    | 'hero'
    | 'order'
    | 'cross'
    | 'medal'
    | 'badge'
    | 'weapon'
    | 'letter'
    | 'title'
    | 'other';

export type AwardGroupId = 'state' | 'president' | 'mod' | 'commander' | 'titles' | 'other';

export type AwardDef = {
    id: string;
    group: AwardGroupId;
    kind: AwardKind;
    /** The name as written in documents. */
    name: string;
    /** Degrees, highest first: I … V. */
    degrees?: readonly string[];
    /** Year the award was established (shown in the catalogue). */
    since?: number;
    /** No longer awarded, but still worn and recorded. */
    retired?: boolean;
};

export type AwardGroup = {
    id: AwardGroupId;
    /** Who normally awards it: the default of «Від кого». */
    awardedBy: string;
};

export const AWARD_GROUPS: readonly AwardGroup[] = [
    { id: 'state', awardedBy: 'Президент України' },
    { id: 'president', awardedBy: 'Президент України' },
    { id: 'mod', awardedBy: 'Міністр оборони України' },
    { id: 'commander', awardedBy: 'Головнокомандувач Збройних Сил України' },
    { id: 'titles', awardedBy: 'Президент України' },
    { id: 'other', awardedBy: '' },
];

const I_III = ['I', 'II', 'III'] as const;
const I_V = ['I', 'II', 'III', 'IV', 'V'] as const;

const state = (id: string, kind: AwardKind, name: string, extra: Partial<AwardDef> = {}) =>
    ({ id, group: 'state', kind, name, ...extra }) as AwardDef;
const president = (id: string, kind: AwardKind, name: string, extra: Partial<AwardDef> = {}) =>
    ({ id, group: 'president', kind, name, ...extra }) as AwardDef;
const mod = (id: string, kind: AwardKind, name: string, extra: Partial<AwardDef> = {}) =>
    ({ id, group: 'mod', kind, name, ...extra }) as AwardDef;
const commander = (id: string, name: string, kind: AwardKind = 'cross') =>
    ({ id, group: 'commander', kind, name, since: 2021 }) as AwardDef;
const title = (id: string, name: string) =>
    ({ id, group: 'titles', kind: 'title', name }) as AwardDef;

export const AWARDS: readonly AwardDef[] = [
    // ------------------------------------------------------------ державні нагороди
    state('hero-gold-star', 'hero', 'Звання Герой України з врученням ордена «Золота Зірка»', {
        since: 1998,
    }),
    state('hero-state-order', 'hero', 'Звання Герой України з врученням ордена Держави', {
        since: 1998,
    }),
    state('order-freedom', 'order', 'Орден Свободи', { since: 2008 }),
    state('order-yaroslav', 'order', 'Орден князя Ярослава Мудрого', { degrees: I_V, since: 1995 }),
    state('order-europe', 'order', 'Орден Європи', { since: 2026 }),
    state('order-merit', 'order', 'Орден «За заслуги»', { degrees: I_III, since: 1996 }),
    state('order-khmelnytsky', 'order', 'Орден Богдана Хмельницького', {
        degrees: I_III,
        since: 1995,
    }),
    state('order-heavenly-hundred', 'order', 'Орден Героїв Небесної Сотні', { since: 2014 }),
    state('order-courage', 'order', 'Орден «За мужність»', { degrees: I_III, since: 1996 }),
    state('order-olga', 'order', 'Орден княгині Ольги', { degrees: I_III, since: 1997 }),
    state('order-danylo', 'order', 'Орден Данила Галицького', { since: 2003 }),
    state('order-mining', 'order', 'Орден «За доблесну шахтарську працю»', {
        degrees: I_III,
        since: 2008,
    }),
    state('medal-military-service', 'medal', 'Медаль «За військову службу Україні»', {
        since: 1996,
    }),
    state('medal-impeccable-service', 'medal', 'Медаль «За бездоганну службу»', {
        degrees: I_III,
        since: 1996,
    }),
    state('medal-defender', 'medal', 'Медаль «Захиснику Вітчизни»', { since: 1999 }),
    state('medal-life-saved', 'medal', 'Медаль «За врятоване життя»', { since: 2008 }),
    state('named-firearm', 'weapon', 'Відзнака «Іменна вогнепальна зброя»', { since: 1995 }),

    // ------------------------------------------------------------ відзнаки Президента
    president('cross-combat-merit', 'cross', 'Хрест бойових заслуг', { since: 2022 }),
    president('cross-mazepa', 'cross', 'Хрест Івана Мазепи', { since: 2009 }),
    president('defense-of-ukraine', 'medal', 'Відзнака Президента України «За оборону України»', {
        since: 2022,
    }),
    president('golden-heart', 'badge', 'Відзнака Президента України «Золоте серце»', {
        since: 2022,
    }),
    president('medal-labor-valor', 'medal', 'Медаль «За працю і звитягу»', { since: 2001 }),
    president(
        'ato-participation',
        'medal',
        'Відзнака Президента України «За участь в антитерористичній операції»',
        { since: 2016 },
    ),
    president(
        'ato-humanitarian',
        'medal',
        'Відзнака Президента України «За гуманітарну участь в антитерористичній операції»',
        { since: 2016 },
    ),
    president(
        'national-legend',
        'badge',
        'Відзнака Президента України «Національна легенда України»',
        { since: 2021 },
    ),
    president(
        'chernobyl-liquidation',
        'medal',
        'Відзнака Президента України «За участь у ліквідації наслідків аварії на Чорнобильській АЕС»',
        { since: 2021 },
    ),
    president('future-of-ukraine', 'badge', 'Відзнака Президента України «Майбутнє України»', {
        since: 2025,
    }),
    president(
        'charity-letter',
        'letter',
        'Почесна грамота Президента України за активну благодійницьку діяльність у гуманітарній сфері',
        { since: 1999 },
    ),
    president('jubilee-70-victory', 'medal', 'Ювілейна медаль «70 років Перемоги над нацизмом»', {
        since: 2015,
        retired: true,
    }),
    president(
        'medal-70-liberation',
        'medal',
        'Медаль «70 років визволення України від фашистських загарбників»',
        { since: 2014, retired: true },
    ),
    president(
        'memorial-afghanistan',
        'medal',
        'Пам’ятна медаль «25 років виведення військ з Афганістану»',
        { since: 2014, retired: true },
    ),
    president(
        'jubilee-25-independence',
        'medal',
        'Ювілейна медаль «25 років незалежності України»',
        { since: 2016, retired: true },
    ),
    president(
        'jubilee-20-independence',
        'medal',
        'Ювілейна медаль «20 років незалежності України»',
        { since: 2011, retired: true },
    ),
    president(
        'jubilee-60-liberation',
        'medal',
        'Ювілейна медаль «60 років визволення України від фашистських загарбників»',
        { since: 2004, retired: true },
    ),

    // ------------------------------------------------------------ Міністерство оборони
    mod('mod-special-merit', 'badge', 'Нагрудний знак «Хрест особливих заслуг»', { since: 2022 }),
    mod('mod-exemplary-service', 'badge', 'Нагрудний знак «За зразкову службу»', { since: 2022 }),
    mod('mod-military-valor', 'badge', 'Нагрудний знак «За військову доблесть»'),
    mod('mod-iron-cross', 'cross', 'Медаль «Залізний хрест»', { since: 2022 }),
    mod('mod-knight-cross', 'cross', 'Медаль «Лицарський хрест»', { since: 2022 }),
    mod('mod-war-cross', 'cross', 'Медаль «Воєнний хрест»', { since: 2022 }),
    mod('mod-cross-valor', 'cross', 'Медаль «Хрест доблесті»', { since: 2022 }),
    mod('mod-wounded', 'medal', 'Медаль «За поранення»', { since: 2022 }),
    mod('mod-cross-honor', 'cross', 'Медаль «Хрест пошани»', { since: 2022 }),
    mod('mod-golden-trident', 'medal', 'Медаль «Золотий тризуб»', { since: 2022 }),
    mod('mod-defense-capability', 'medal', 'Медаль «За зміцнення обороноздатності»', {
        since: 2022,
    }),
    mod('mod-brotherhood-star', 'medal', 'Медаль «Зірка військового братерства»', {
        since: 2022,
    }),
    mod('mod-defender-of-ukraine', 'medal', 'Медаль «Захиснику України»', { since: 2022 }),
    mod('mod-defense-assistance', 'medal', 'Медаль «За сприяння обороні»', { since: 2022 }),
    mod('mod-cross-land-forces', 'cross', 'Медаль «Хрест Сухопутних військ»', { since: 2022 }),
    mod('mod-cross-air-force', 'cross', 'Медаль «Хрест Повітряних Сил»', { since: 2022 }),
    mod('mod-cross-navy', 'cross', 'Медаль «Хрест Військово-Морських Сил»', { since: 2022 }),
    mod('mod-cross-sof', 'cross', 'Медаль «Хрест Сил спеціальних операцій»', { since: 2022 }),
    mod('mod-cross-tdf', 'cross', 'Медаль «Хрест Сил територіальної оборони»', { since: 2022 }),
    mod('mod-cross-logistics', 'cross', 'Медаль «Хрест Сил логістики»', { since: 2022 }),
    mod('mod-cross-support', 'cross', 'Медаль «Хрест Сил підтримки»', { since: 2022 }),
    mod('mod-cross-medical', 'cross', 'Медаль «Хрест Медичних сил»', { since: 2022 }),
    mod('mod-cross-air-assault', 'cross', 'Медаль «Хрест Десантно-штурмових військ»', {
        since: 2022,
    }),
    mod('mod-cross-signal', 'cross', 'Медаль «Хрест Військ зв’язку та кібербезпеки»', {
        since: 2022,
    }),
    mod('mod-cross-artillery', 'cross', 'Медаль «Хрест ракетних військ і артилерії»', {
        since: 2022,
    }),
    mod('mod-cross-transport', 'cross', 'Медаль «Хрест Державної спеціальної служби транспорту»', {
        since: 2022,
    }),
    mod('mod-peacekeeper', 'medal', 'Медаль «Воїн-миротворець»', { since: 2022 }),
    mod('mod-veteran', 'medal', 'Медаль «Ветеран служби»', { since: 2022 }),
    mod('mod-20-years', 'medal', 'Медаль «20 років сумлінної служби»'),
    mod('mod-15-years', 'medal', 'Медаль «15 років сумлінної служби»'),
    mod('mod-10-years', 'medal', 'Медаль «10 років сумлінної служби»'),
    mod('mod-honorary-letter', 'letter', 'Почесна грамота Міністерства оборони України'),
    mod('mod-letter', 'letter', 'Грамота Міністерства оборони України'),
    mod('mod-gratitude', 'letter', 'Подяка Міністерства оборони України'),
    mod('mod-firearm', 'weapon', 'Вогнепальна зброя (відзнака Міністерства оборони)', {
        since: 1999,
    }),
    mod('mod-cold-weapon', 'weapon', 'Холодна зброя (відзнака Міністерства оборони)', {
        since: 1999,
    }),
    mod('mod-sign-of-honor', 'badge', 'Нагрудний знак «Знак пошани»', { retired: true }),
    mod('mod-cooperation', 'medal', 'Медаль «За розвиток військового співробітництва»', {
        retired: true,
    }),
    mod('mod-assistance-afu', 'medal', 'Медаль «За сприяння Збройним Силам України»', {
        retired: true,
    }),
    mod('mod-memorial-valor', 'badge', 'Пам’ятний знак «За воїнську доблесть»', {
        retired: true,
    }),

    // ------------------------------------------------------------ Головнокомандувач ЗСУ
    commander('cic-cross-merit', 'Почесний нагрудний знак «Хрест заслуги»'),
    commander('cic-cross-brave', 'Почесний нагрудний знак «Хрест хоробрих»'),
    commander('cic-steel-cross', 'Почесний нагрудний знак «Сталевий хрест»'),
    commander('cic-silver-cross', 'Почесний нагрудний знак «Срібний хрест»'),
    commander('cic-golden-cross', 'Почесний нагрудний знак «Золотий хрест»'),
    commander('cic-military-honor', 'Почесний нагрудний знак «Хрест «Військова честь»»'),
    commander('cic-conscientious', 'Почесний нагрудний знак «За сумлінну службу»', 'badge'),
    commander('cic-combatant-cross', 'Почесний нагрудний знак «Комбатантський хрест»'),
    commander('cic-honor-memory', 'Почесний нагрудний знак «Честь та пам’ять»', 'badge'),
    commander('cic-indomitability', 'Почесний нагрудний знак «За незламність»', 'badge'),
    commander('cic-life-saved', 'Почесний нагрудний знак «За збережене життя»', 'badge'),
    commander('cic-assistance', 'Почесний нагрудний знак «За сприяння війську»', 'badge'),
    commander(
        'cic-best-sergeant',
        'Почесний нагрудний знак «Кращий сержант (старшина) Збройних Сил України»',
        'badge',
    ),

    // ------------------------------------------------------------ почесні звання України
    title('title-people-artist', 'Народний артист України'),
    title('title-people-architect', 'Народний архітектор України'),
    title('title-people-teacher', 'Народний вчитель України'),
    title('title-people-painter', 'Народний художник України'),
    title('title-artist', 'Заслужений артист України'),
    title('title-architect', 'Заслужений архітектор України'),
    title('title-builder', 'Заслужений будівельник України'),
    title('title-inventor', 'Заслужений винахідник України'),
    title('title-teacher', 'Заслужений вчитель України'),
    title('title-miner', 'Заслужений гірник України'),
    title('title-arts', 'Заслужений діяч мистецтв України'),
    title('title-science', 'Заслужений діяч науки і техніки України'),
    title('title-donor', 'Заслужений донор України'),
    title('title-economist', 'Заслужений економіст України'),
    title('title-power', 'Заслужений енергетик України'),
    title('title-journalist', 'Заслужений журналіст України'),
    title('title-land', 'Заслужений землевпорядник України'),
    title('title-doctor', 'Заслужений лікар України'),
    title('title-forester', 'Заслужений лісівник України'),
    title('title-folk-art', 'Заслужений майстер народної творчості України'),
    title('title-machine', 'Заслужений машинобудівник України'),
    title('title-metallurgist', 'Заслужений металург України'),
    title('title-metrologist', 'Заслужений метролог України'),
    title('title-veterinary', 'Заслужений працівник ветеринарної медицини України'),
    title('title-culture', 'Заслужений працівник культури України'),
    title('title-education', 'Заслужений працівник освіти України'),
    title('title-health', 'Заслужений працівник охорони здоров’я України'),
    title('title-industry', 'Заслужений працівник промисловості України'),
    title('title-transport', 'Заслужений працівник транспорту України'),
    title('title-tourism', 'Заслужений працівник туризму України'),
    title('title-agriculture', 'Заслужений працівник сільського господарства України'),
    title('title-social', 'Заслужений працівник соціальної сфери України'),
    title('title-services', 'Заслужений працівник сфери послуг України'),
    title('title-pharmacy', 'Заслужений працівник фармації України'),
    title('title-sport', 'Заслужений працівник фізичної культури і спорту України'),
    title('title-civil-protection', 'Заслужений працівник цивільного захисту України'),
    title('title-nature', 'Заслужений природоохоронець України'),
    title('title-rationalizer', 'Заслужений раціоналізатор України'),
    title('title-painter', 'Заслужений художник України'),
    title('title-coal-miner', 'Заслужений шахтар України'),
    title('title-lawyer', 'Заслужений юрист України'),
    title('title-mother-heroine', 'Мати-героїня'),

    // ------------------------------------------------------------ written by hand
    { id: 'other', group: 'other', kind: 'other', name: 'Інша нагорода' },
];

const BY_ID = new Map(AWARDS.map((award) => [award.id, award]));

export function findAward(id: string | null | undefined): AwardDef | undefined {
    return id ? BY_ID.get(id) : undefined;
}

export function awardGroup(id: AwardGroupId): AwardGroup {
    return AWARD_GROUPS.find((group) => group.id === id) ?? AWARD_GROUPS[AWARD_GROUPS.length - 1];
}

/** Statuses in the order an award goes through them. */
export const AWARD_STATUSES: readonly AwardStatus[] = [
    'draft',
    'submitted',
    'awarded',
    'presented',
    'rejected',
];

/** The person holds it (a decree / order exists). */
export function isGranted(record: Pick<AwardRecord, 'status'>): boolean {
    return record.status === 'awarded' || record.status === 'presented';
}

/** «Орден «За мужність» III ступеня», or the name written by hand. */
export function awardTitle(record: Pick<AwardRecord, 'awardId' | 'title' | 'degree'>): string {
    const award = findAward(record.awardId);
    const name =
        record.title?.trim() || (award && award.id !== 'other' ? award.name : '') || 'Нагорода';
    return record.degree && award?.degrees?.includes(record.degree)
        ? `${name} ${record.degree} ступеня`
        : name;
}

/** A new record for an award picked in the catalogue: the lowest degree, submitted. */
export function newAwardRecord(award: AwardDef): AwardRecord {
    return {
        id: crypto.randomUUID(),
        awardId: award.id,
        degree: award.degrees ? award.degrees[award.degrees.length - 1] : undefined,
        awardedBy: defaultAwardedBy(award.id),
        status: 'submitted',
    };
}

/** Who usually awards it (the default of «Від кого»). */
export function defaultAwardedBy(awardId: string): string {
    const award = findAward(awardId);
    return award ? awardGroup(award.group).awardedBy : '';
}

/** Common answers for «Від кого». */
export const AWARDED_BY_SUGGESTIONS = [
    'Президент України',
    'Міністр оборони України',
    'Головнокомандувач Збройних Сил України',
    'Командувач Сухопутних військ Збройних Сил України',
    'Командувач оперативно-стратегічного угруповання військ',
    'Командувач оперативно-тактичного угруповання',
    'Командир бригади',
    'Командир військової частини',
] as const;

/** Orders first, then crosses and medals: how awards are listed in a document. */
const KIND_ORDER: AwardKind[] = [
    'hero',
    'order',
    'cross',
    'medal',
    'weapon',
    'badge',
    'title',
    'letter',
    'other',
];
const GROUP_ORDER: AwardGroupId[] = ['state', 'president', 'mod', 'commander', 'titles', 'other'];

/** Most important first: state awards before departmental ones, orders before medals. */
export function compareAwards(a: AwardRecord, b: AwardRecord): number {
    const da = findAward(a.awardId) ?? findAward('other')!;
    const db = findAward(b.awardId) ?? findAward('other')!;
    return (
        GROUP_ORDER.indexOf(da.group) - GROUP_ORDER.indexOf(db.group) ||
        KIND_ORDER.indexOf(da.kind) - KIND_ORDER.indexOf(db.kind) ||
        AWARDS.indexOf(da) - AWARDS.indexOf(db) ||
        (da.degrees?.indexOf(a.degree ?? '') ?? 0) - (db.degrees?.indexOf(b.degree ?? '') ?? 0)
    );
}

/** One line per granted award, for documents: «Орден «За мужність» III ступеня (Указ № 12/2024 від 01.02.2024)». */
export function awardsSummary(
    records: AwardRecord[] | null | undefined,
    onlyGranted = true,
): string {
    return (Array.isArray(records) ? records : [])
        .filter((record) => !onlyGranted || isGranted(record))
        .sort(compareAwards)
        .map((record) => {
            const order = [
                record.orderNumber?.trim() && `№ ${record.orderNumber.trim()}`,
                record.orderDate?.trim() && `від ${record.orderDate.trim()}`,
            ]
                .filter(Boolean)
                .join(' ');
            return order ? `${awardTitle(record)} (${order})` : awardTitle(record);
        })
        .join('; ');
}
