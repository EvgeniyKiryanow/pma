import { describe, expect, it } from 'vitest';

import { StatusExcel } from '../../../shared/utils/excelUserStatuses';
import {
    ATTACHED_ROW,
    buildAlternateReport,
    NO_UNIT_ROW,
    peopleIn,
    positionsIn,
    REPORT_COLUMNS,
    type ReportPerson,
    type ReportPosition,
    reportUnitOf,
    TOTAL_ROW,
} from './alternateReport';

const column = (field: string) => REPORT_COLUMNS.find((c) => c.field === field)!;

const positions: ReportPosition[] = [
    {
        shtat_number: '1',
        unit_name: 'Управління\r\nроти',
        position_name: 'Командир роти',
        category: 'оф',
    },
    {
        shtat_number: '2',
        unit_name: 'Управління\r\nроти',
        position_name: 'Старшина',
        category: 'с-т',
    },
    {
        shtat_number: '10',
        unit_name: 'Управління\r\n1 взвод',
        position_name: 'Командир взводу',
        category: 'оф',
    },
    {
        shtat_number: '11',
        unit_name: '1 взвод\r\n1 відділення',
        position_name: 'Стрілець',
        category: 'солд',
    },
    {
        shtat_number: '12',
        unit_name: '1 взвод\r\n2 відділення',
        position_name: 'Кулеметник',
        category: 'солд',
    },
    {
        shtat_number: '20',
        unit_name: '2 взвод\r\n1 відділення',
        position_name: 'Стрілець',
        category: 'солд',
    },
    { shtat_number: '90', unit_name: 'Прикомандировані', position_name: 'Водій', category: 'солд' },
];

let nextId = 1;
const person = (patch: Partial<ReportPerson>): ReportPerson => ({
    id: nextId++,
    fullName: `Особа ${nextId}`,
    rank: 'солдат',
    position: '',
    category: '',
    unitMain: '',
    soldierStatus: StatusExcel.POSITIONS_INFANTRY,
    ...patch,
});

describe('alternate report', () => {
    const commander = person({ shpkNumber: '1', soldierStatus: StatusExcel.MANAGEMENT });
    const platoonLeader = person({ shpkNumber: '10', soldierStatus: StatusExcel.ABSENT_REHAB });
    const rifleman = person({ shpkNumber: '11', unitMain: '3 взвод' });
    const gunner = person({ shpkNumber: '12', soldierStatus: StatusExcel.ABSENT_HOSPITALIZED });
    const unassigned = person({ unitMain: '2-й взвод', soldierStatus: StatusExcel.POSITIONS_UAV });
    const noUnit = person({ soldierStatus: '' });
    const driver = person({ shpkNumber: '90', soldierStatus: StatusExcel.SUPPLY_GENERAL });
    const excluded = person({ shpkNumber: 'excluded', unitMain: '1 взвод' });
    const onOrder = person({ shpkNumber: 'order-5', unitMain: '1 взвод' });
    const report = buildAlternateReport(
        [commander, platoonLeader, rifleman, gunner, unassigned, noUnit, driver, excluded, onOrder],
        positions,
    );
    const row = (name: string) => report.rows.find((r) => r.name === name)!;

    it('has one row per subunit of the БЧС, in the order of the form', () => {
        expect(report.rows.map((r) => r.name)).toEqual([
            'Управління роти',
            '1-й взвод',
            '2-й взвод',
            NO_UNIT_ROW,
            TOTAL_ROW,
            ATTACHED_ROW,
        ]);
    });

    it('counts positions of the staff, officers apart', () => {
        expect(row('Управління роти').values).toMatchObject({
            plannedTotal: 2,
            plannedOfficer: 1,
            plannedSoldier: 1,
        });
        expect(row('1-й взвод').values).toMatchObject({
            plannedTotal: 3,
            plannedOfficer: 1,
            plannedSoldier: 2,
        });
        expect(positionsIn(row('1-й взвод'), column('plannedOfficer'))).toEqual([positions[2]]);
    });

    it('places people by their staff position, otherwise by the unit in their card', () => {
        // The rifleman's card still says "3 взвод": the position decides.
        expect(row('1-й взвод').people).toEqual([platoonLeader, rifleman, gunner]);
        expect(row('2-й взвод').people).toEqual([unassigned]);
        expect(row(NO_UNIT_ROW).people).toEqual([noUnit]);
        expect(report.rows.some((r) => r.name === '3-й взвод')).toBe(false);
    });

    it('leaves out excluded people and people handed over by an order', () => {
        const everyone = report.rows.flatMap((r) => r.people);
        expect(everyone).not.toContain(excluded);
        expect(everyone).not.toContain(onOrder);
    });

    it('shows exactly who is behind every number', () => {
        const platoon = row('1-й взвод');
        expect(platoon.values.actualTotal).toBe(3);
        expect(platoon.values.actualOfficers).toBe(1);
        expect(peopleIn(report, platoon, column('actualOfficers'))).toEqual([platoonLeader]);
        expect(peopleIn(report, platoon, column('positionsInfantry'))).toEqual([rifleman]);
        expect(peopleIn(report, platoon, column('absentAllAlternative'))).toEqual([
            platoonLeader,
            gunner,
        ]);
        expect(platoon.values.inCombatNow).toBe(1);
        expect(platoon.values.staffingPercent).toBe('100%');
        expect(platoon.values.percentNowCurrent).toBe('33%');
    });

    it('sums the subunits in ВСЬОГО and keeps the attached apart', () => {
        const total = row(TOTAL_ROW);
        expect(total.values.plannedTotal).toBe(6);
        expect(total.values.actualTotal).toBe(6);
        expect(total.values.absentAllAlternative).toBe(2);
        expect(total.values.supplyGeneral).toBe(0);
        expect(row(ATTACHED_ROW).values).toMatchObject({
            plannedTotal: 1,
            actualTotal: 1,
            supplyGeneral: 1,
        });
        for (const field of [
            'plannedTotal',
            'actualTotal',
            'inCombatNow',
            'absentAllAlternative',
        ]) {
            const units = report.rows.filter((r) => r.kind === 'unit');
            expect(units.reduce((sum, r) => sum + Number(r.values[field]), 0)).toBe(
                total.values[field],
            );
        }
    });

    it('lists people whose status the report does not know', () => {
        expect(report.withoutStatus).toEqual([noUnit]);
    });

    it('keeps an attached row even when nobody is attached', () => {
        const empty = buildAlternateReport([], positions.slice(0, 2));
        expect(empty.rows.map((r) => r.name)).toEqual(['Управління роти', TOTAL_ROW, ATTACHED_ROW]);
        expect(empty.rows[2].values.actualTotal).toBe(0);
    });
});

describe('reportUnitOf', () => {
    it('reads the unit names found in real БЧС files', () => {
        expect(reportUnitOf('Управління\r\nроти')).toBe('Управління роти');
        expect(reportUnitOf('Управління\r\n1 взвод')).toBe('1-й взвод');
        expect(reportUnitOf('1 взвод\r\n1 відділення')).toBe('1-й взвод');
        expect(reportUnitOf('2-й взвод')).toBe('2-й взвод');
        expect(reportUnitOf('Взвод забезпечення\r\n1 відділення')).toBe('Взвод забезпечення');
        expect(reportUnitOf('прикомандировані')).toBe(ATTACHED_ROW);
        expect(reportUnitOf('')).toBe(NO_UNIT_ROW);
        expect(reportUnitOf(null)).toBe(NO_UNIT_ROW);
    });
});

describe('attached personnel', () => {
    it('counts an attached person in «Прикомандировані», not in the unit or ВСЬОГО', () => {
        const attached = person({
            shpkNumber: '11',
            soldierStatus: StatusExcel.POSITIONS_INFANTRY,
            isAttached: 1,
        });
        const own = person({ shpkNumber: '12', soldierStatus: StatusExcel.POSITIONS_INFANTRY });
        const report = buildAlternateReport([attached, own], positions);
        const row = (name: string) => report.rows.find((r) => r.name === name)!;
        expect(row(ATTACHED_ROW).people).toEqual([attached]);
        expect(row('1-й взвод').people).toEqual([own]);
        expect(row(TOTAL_ROW).values.actualTotal).toBe(1);
        expect(row(ATTACHED_ROW).values.positionsInfantry).toBe(1);
    });
});
