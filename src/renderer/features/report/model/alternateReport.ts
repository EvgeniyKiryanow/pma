import type { User } from '../../../../shared/types/user';
import type { ShtatnaPosada } from '../../../entities/shtatna-posada/model/useShtatniStore';
import { StatusExcel } from '../../../shared/utils/excelUserStatuses';
import { canonicalUnit } from '../../../shared/utils/plannedTotalsFromShtatni';

/**
 * «Альтернативний звіт» (бойове донесення) built from the live data: rows are the subunits of
 * the БЧС, people belong to the subunit of their staff position (or of the unit written in
 * their card while they have none), every number is the size of a set of positions or people.
 * The screen, the drill-down and the Excel export all read this one model, so what the
 * commander receives is exactly what the screen shows.
 */

export type ReportPerson = Pick<
    User,
    'id' | 'fullName' | 'rank' | 'position' | 'soldierStatus' | 'category' | 'unitMain'
> & { shpkNumber?: string | null };

export type ReportPosition = Pick<
    ShtatnaPosada,
    'shtat_number' | 'unit_name' | 'position_name' | 'category'
>;

type StatusGroup = readonly string[];

const S = StatusExcel;

const ON_POSITIONS: StatusGroup = [
    S.POSITIONS_BRONEGROUP,
    S.POSITIONS_INFANTRY,
    S.POSITIONS_CREW,
    S.POSITIONS_CALCULATION,
    S.POSITIONS_UAV,
    S.POSITIONS_RESERVE_INFANTRY,
];

/** In the unit but not in combat («ВСЬОГО НЕ БГ»). */
const NOT_IN_COMBAT: StatusGroup = [
    S.NON_COMBAT_NEWCOMERS,
    S.NON_COMBAT_LIMITED_FITNESS,
    S.NON_COMBAT_LIMITED_FITNESS_IN_COMBAT,
    S.NON_COMBAT_REFUSERS,
    S.ABSENT_REHABED_ON,
    S.HAVE_OFFER_TO_HOS,
];

/** Physically in the unit («В НАЯВНОСТІ», «В ПІДРОЗДІЛІ»). */
export const PRESENT_STATUSES: StatusGroup = [
    ...ON_POSITIONS,
    S.MANAGEMENT,
    S.SUPPLY_COMBAT,
    S.SUPPLY_GENERAL,
    ...NOT_IN_COMBAT,
];

/** «ВСЬОГО ВІДСУТНІХ». */
export const ABSENT_STATUSES: StatusGroup = [
    S.ABSENT_VLK,
    S.ABSENT_HOSPITALIZED,
    S.ABSENT_MEDICAL_COMPANY,
    S.ABSENT_REHAB_LEAVE,
    S.ABSENT_REHAB,
    S.ABSENT_BUSINESS_TRIP,
    S.ABSENT_SZO,
    S.ABSENT_WOUNDED,
    S.ABSENT_KIA,
    S.ABSENT_MIA,
];

export type ColumnKind = 'planned' | 'list' | 'status' | 'percent';

export type ReportColumn = {
    /** Key of the value (the same keys the Excel export has always used). */
    field: string;
    /** What the drill-down window calls the cell. */
    label: string;
    kind: ColumnKind;
    /** Status columns: the statuses counted in the cell. */
    statuses?: StatusGroup;
    /** Officers only (true), sergeants and soldiers only (false), everyone (undefined). */
    officers?: boolean;
    /** Colour of the paper form. */
    fill?: string;
    /** Thick line after the column (groups of the form). */
    groupEnd?: boolean;
};

const status = (
    field: string,
    label: string,
    statuses: StatusGroup,
    extra: Partial<ReportColumn> = {},
): ReportColumn => ({ field, label, kind: 'status', statuses, ...extra });

/** Columns in the order of the form (after «№» and «Підрозділ»). */
export const REPORT_COLUMNS: ReportColumn[] = [
    { field: 'plannedTotal', label: 'За штатом — всього', kind: 'planned' },
    { field: 'plannedOfficer', label: 'За штатом — офіцери', kind: 'planned', officers: true },
    {
        field: 'plannedSoldier',
        label: 'За штатом — сержанти і солдати',
        kind: 'planned',
        officers: false,
        groupEnd: true,
    },
    { field: 'staffingPercent', label: '% укомплектованості', kind: 'percent' },
    { field: 'actualTotal', label: 'За списком — всього', kind: 'list' },
    { field: 'actualOfficers', label: 'За списком — офіцери', kind: 'list', officers: true },
    {
        field: 'actualSoldiers',
        label: 'За списком — сержанти і солдати',
        kind: 'list',
        officers: false,
    },
    { field: 'percentNowCurrent', label: '% в наявності', kind: 'percent', groupEnd: true },
    status('inCombatNow', 'В наявності — всього', PRESENT_STATUSES, { fill: '#f8da78' }),
    status('inCombatNowOfficer', 'В наявності — офіцери', PRESENT_STATUSES, {
        officers: true,
        fill: '#f8da78',
    }),
    status('inCombatNowSoldier', 'В наявності — сержанти і солдати', PRESENT_STATUSES, {
        officers: false,
        fill: '#f8da78',
        groupEnd: true,
    }),
    status('oNPostition', 'На позиції', [S.POSITIONS_INFANTRY, S.POSITIONS_BRONEGROUP], {
        fill: '#9fce63',
    }),
    status('positionsBronegroup', 'Бронегрупа', [S.POSITIONS_BRONEGROUP], { fill: '#d7dce3' }),
    status('positionsInfantry', 'Позиції піхоти', [S.POSITIONS_INFANTRY], { fill: '#d7dce3' }),
    status('positionsCrew', 'Позиції — екіпаж', [S.POSITIONS_CREW], { fill: '#eab38a' }),
    status('positionsCalc', 'Позиції — розрахунок', [S.POSITIONS_CALCULATION], {
        fill: '#eab38a',
    }),
    status('positionsUav', 'Позиції БПЛА', [S.POSITIONS_UAV], { fill: '#eab38a' }),
    status('positionsReserveInfantry', 'Резерв піхота', [S.POSITIONS_RESERVE_INFANTRY], {
        fill: '#eab38a',
    }),
    status('totalManagement', 'Управління', [S.MANAGEMENT], { fill: '#eab38a' }),
    status('supplyCombat', 'Бойове забезпечення', [S.SUPPLY_COMBAT], { fill: '#eab38a' }),
    status('supplyGeneral', 'Забезпечення', [S.SUPPLY_GENERAL], { fill: '#eab38a' }),
    status('nonCombatNewcomers', 'Новоприбулі, навчання в підрозділі', [S.NON_COMBAT_NEWCOMERS], {
        fill: '#eab38a',
    }),
    status('nonCombatLimited', 'Обмежено придатні', [S.NON_COMBAT_LIMITED_FITNESS], {
        fill: '#f9da77',
    }),
    status(
        'nonCombatLimitedInCombat',
        'Хворі в підрозділі',
        [S.NON_COMBAT_LIMITED_FITNESS_IN_COMBAT],
        { fill: '#f9da77' },
    ),
    status('nonCombatRefusers', 'Відмовники', [S.NON_COMBAT_REFUSERS], { fill: '#f9da77' }),
    status('absentRehabedOn', 'Звільняються', [S.ABSENT_REHABED_ON], { fill: '#f9da77' }),
    status(
        'haveOfferToJost',
        'Мають направлення на лікування, обстеження, ВЛК',
        [S.HAVE_OFFER_TO_HOS],
        { fill: '#f9da77' },
    ),
    status('nonOnBG', 'Всього не БГ', NOT_IN_COMBAT, { fill: '#b89230', groupEnd: true }),
    status('inCombatNow', 'В підрозділі', PRESENT_STATUSES, { groupEnd: true }),
    status('absentVLK', 'ВЛК', [S.ABSENT_VLK], { fill: '#eab38a' }),
    status('absentHospital', 'Шпиталь / лікарня', [S.ABSENT_HOSPITALIZED], { fill: '#eab38a' }),
    status('absentMedCompany', 'Мед. рота', [S.ABSENT_MEDICAL_COMPANY], { fill: '#eab38a' }),
    status('absentRehabLeave', 'Відпустка (реабілітація)', [S.ABSENT_REHAB_LEAVE], {
        fill: '#fcf2cf',
    }),
    status('absentRehab', 'Відпустка', [S.ABSENT_REHAB], { fill: '#fcf2cf' }),
    status('absentBusinessTrip', 'Відрядження', [S.ABSENT_BUSINESS_TRIP], { fill: '#fcf2cf' }),
    status('absentSZO', 'СЗЧ', [S.ABSENT_SZO], { fill: '#fcf2cf' }),
    status('absentWounded', 'Поранені', [S.ABSENT_WOUNDED]),
    status('absent200', 'Загиблі', [S.ABSENT_KIA]),
    status('absentMIA', 'Зниклі безвісті', [S.ABSENT_MIA]),
    status('absentAllAlternative', 'Всього відсутніх', ABSENT_STATUSES, { groupEnd: true }),
];

export const TOTAL_ROW = 'ВСЬОГО';
export const NO_UNIT_ROW = 'Без підрозділу';
export const ATTACHED_ROW = 'Прикомандировані';

export type ReportRow = {
    name: string;
    /** `total` sums the subunits; `attached` is shown after it and not counted in it. */
    kind: 'unit' | 'total' | 'attached';
    positions: ReportPosition[];
    people: ReportPerson[];
    values: Record<string, number | string>;
};

export type AlternateReport = {
    rows: ReportRow[];
    /** On the list without a status the report knows: counted neither present nor absent. */
    withoutStatus: ReportPerson[];
    /** Staff position of each person who holds one (by person id). */
    positionOf: Map<number, ReportPosition>;
};

/** On the unit's list: not excluded and not handed over by an order. */
export function isOnList(person: { shpkNumber?: string | null }): boolean {
    const number = String(person.shpkNumber ?? '');
    return number !== 'excluded' && !number.includes('order');
}

export function isOfficer(category: string | null | undefined): boolean {
    return /оф/i.test(category ?? '');
}

/** The report row of a unit name from the БЧС or a card ("1 взвод\n2 відділення" → "1-й взвод"). */
export function reportUnitOf(unit: string | null | undefined): string {
    const text = String(unit ?? '').trim();
    if (!text) return NO_UNIT_ROW;
    if (/прикоманд/i.test(text)) return ATTACHED_ROW;
    const canonical = canonicalUnit(text);
    return canonical.split(/\r?\n/)[0].replace(/\s+/g, ' ').trim() || NO_UNIT_ROW;
}

function rowOrder(name: string): [number, number] {
    if (/^управління роти$/i.test(name)) return [0, 0];
    const platoon = /^(\d+)-й взвод$/.exec(name);
    if (platoon) return [1, Number(platoon[1])];
    if (name === NO_UNIT_ROW) return [3, 0];
    return [2, 0];
}

function compareRows(a: string, b: string): number {
    const [groupA, numberA] = rowOrder(a);
    const [groupB, numberB] = rowOrder(b);
    return groupA - groupB || numberA - numberB || a.localeCompare(b, 'uk');
}

function percent(part: number, whole: number): string {
    return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '0%';
}

/** The positions a planned cell counts. */
export function positionsIn(row: ReportRow, column: ReportColumn): ReportPosition[] {
    if (column.kind !== 'planned') return [];
    if (column.officers === undefined) return row.positions;
    return row.positions.filter((pos) => isOfficer(pos.category) === column.officers);
}

/** The people a list or status cell counts. */
export function peopleIn(
    report: Pick<AlternateReport, 'positionOf'>,
    row: ReportRow,
    column: ReportColumn,
): ReportPerson[] {
    if (column.kind !== 'list' && column.kind !== 'status') return [];
    return row.people.filter((person) => {
        if (column.statuses && !column.statuses.includes(person.soldierStatus ?? '')) return false;
        if (column.officers === undefined) return true;
        const category = report.positionOf.get(person.id)?.category ?? person.category;
        return isOfficer(category) === column.officers;
    });
}

function fillValues(report: Pick<AlternateReport, 'positionOf'>, row: ReportRow): void {
    for (const column of REPORT_COLUMNS) {
        if (column.kind === 'planned') row.values[column.field] = positionsIn(row, column).length;
        if (column.kind === 'list' || column.kind === 'status') {
            row.values[column.field] = peopleIn(report, row, column).length;
        }
    }
    const planned = Number(row.values.plannedTotal);
    row.values.staffingPercent = percent(Number(row.values.actualTotal), planned);
    row.values.percentNowCurrent = percent(Number(row.values.inCombatNow), planned);
}

export function buildAlternateReport(
    users: ReportPerson[],
    positions: ReportPosition[],
): AlternateReport {
    const byNumber = new Map(positions.map((pos) => [String(pos.shtat_number), pos]));
    const rows = new Map<string, ReportRow>();
    const rowNamed = (name: string): ReportRow => {
        let row = rows.get(name);
        if (!row) {
            row = {
                name,
                kind: name === ATTACHED_ROW ? 'attached' : 'unit',
                positions: [],
                people: [],
                values: {},
            };
            rows.set(name, row);
        }
        return row;
    };

    const positionOf = new Map<number, ReportPosition>();
    for (const pos of positions) rowNamed(reportUnitOf(pos.unit_name)).positions.push(pos);
    const onList = users.filter(isOnList);
    for (const person of onList) {
        const pos = person.shpkNumber ? byNumber.get(String(person.shpkNumber)) : undefined;
        if (pos) positionOf.set(person.id, pos);
        rowNamed(reportUnitOf(pos?.unit_name ?? person.unitMain)).people.push(person);
    }

    const units = [...rows.values()]
        .filter((row) => row.kind === 'unit')
        .sort((a, b) => compareRows(a.name, b.name));
    const total: ReportRow = {
        name: TOTAL_ROW,
        kind: 'total',
        positions: units.flatMap((row) => row.positions),
        people: units.flatMap((row) => row.people),
        values: {},
    };
    const attached = rowNamed(ATTACHED_ROW);

    const report: AlternateReport = {
        rows: [...units, total, attached],
        withoutStatus: onList.filter(
            (person) =>
                !PRESENT_STATUSES.includes(person.soldierStatus ?? '') &&
                !ABSENT_STATUSES.includes(person.soldierStatus ?? ''),
        ),
        positionOf,
    };
    for (const row of report.rows) fillValues(report, row);
    return report;
}
