import { beforeEach, describe, expect, it } from 'vitest';

import { StatusExcel } from '../../../../shared/utils/excelUserStatuses';
import { UnitStatsCalculator } from './UnitStatsCalculator';

const person = (unitMain: string, soldierStatus: StatusExcel, category = 'Сол') => ({
    unitMain,
    soldierStatus,
    category,
});

const PLANNED = {
    'Управління роти': { total: 10, officer: 3, soldier: 7 },
    '1-й взвод': { total: 30, officer: 1, soldier: 29 },
    '2-й взвод': { total: 30, officer: 1, soldier: 29 },
    '3-й взвод': { total: 30, officer: 1, soldier: 29 },
};

beforeEach(() => {
    UnitStatsCalculator.setPlannedTotals(PLANNED);
});

describe('filterUsersByUnit', () => {
    it('matches the unit regardless of how the platoon is written', () => {
        const users = [
            person('1-й взвод', StatusExcel.POSITIONS_INFANTRY),
            person('1 взвод', StatusExcel.POSITIONS_INFANTRY),
            person('1-взвод', StatusExcel.POSITIONS_INFANTRY),
            person('2-й взвод', StatusExcel.POSITIONS_INFANTRY),
        ];
        expect(UnitStatsCalculator.filterUsersByUnit(users, '1-й взвод')).toHaveLength(3);
    });

    it('reads a unit written on several lines', () => {
        const users = [{ unitMain: '1-й взвод\n2 відділення', soldierStatus: StatusExcel.POSITIONS_INFANTRY }];
        expect(UnitStatsCalculator.filterUsersByUnit(users, '1-й взвод')).toHaveLength(1);
    });

    it('reads a unit written with separators', () => {
        const users = [{ unitMain: 'Управління роти; водії', soldierStatus: StatusExcel.MANAGEMENT }];
        expect(UnitStatsCalculator.filterUsersByUnit(users, 'Управління роти')).toHaveLength(1);
    });

    it('does not match a different unit', () => {
        const users = [person('3-й взвод', StatusExcel.POSITIONS_INFANTRY)];
        expect(UnitStatsCalculator.filterUsersByUnit(users, '1-й взвод')).toHaveLength(0);
    });

    it('ignores people without a unit', () => {
        const users = [{ soldierStatus: StatusExcel.POSITIONS_INFANTRY }, { unitMain: '' }];
        expect(UnitStatsCalculator.filterUsersByUnit(users, '1-й взвод')).toHaveLength(0);
    });
});

describe('calculateStatusTotalsExplicit', () => {
    it('counts positions, absences and the totals built from them', () => {
        const users = [
            person('1-й взвод', StatusExcel.POSITIONS_INFANTRY),
            person('1-й взвод', StatusExcel.POSITIONS_INFANTRY),
            person('1-й взвод', StatusExcel.POSITIONS_BRONEGROUP),
            person('1-й взвод', StatusExcel.POSITIONS_UAV),
            person('1-й взвод', StatusExcel.MANAGEMENT),
            person('1-й взвод', StatusExcel.ABSENT_VLK),
            person('1-й взвод', StatusExcel.ABSENT_HOSPITALIZED),
            person('1-й взвод', StatusExcel.ABSENT_SZO),
            person('1-й взвод', StatusExcel.NON_COMBAT_REFUSERS),
        ];

        const totals = UnitStatsCalculator.calculateStatusTotalsExplicit(users);

        expect(totals.positionsInfantry).toBe(2);
        expect(totals.positionsBronegroup).toBe(1);
        expect(totals.oNPostition).toBe(3); // infantry + armoured group
        expect(totals.positionsUav).toBe(1);
        expect(totals.totalPositions).toBe(4);
        expect(totals.totalManagement).toBe(1);
        expect(totals.absentVLK).toBe(1);
        expect(totals.absentSZO).toBe(1);
        expect(totals.totalAbsent).toBe(3); // ВЛК + шпиталь + СЗЧ
        expect(totals.totalMissing).toBe(4); // + відмовник (non-combat)
        expect(totals.inCombatNow).toBe(6); // positions + management + refuser
    });

    it('returns zeros for an empty list', () => {
        const totals = UnitStatsCalculator.calculateStatusTotalsExplicit([]);
        expect(totals.totalPositions).toBe(0);
        expect(totals.totalAbsent).toBe(0);
        expect(totals.inCombatNow).toBe(0);
    });

    it('ignores people without a status', () => {
        const totals = UnitStatsCalculator.calculateStatusTotalsExplicit([{}, { soldierStatus: '' }]);
        expect(totals.totalPositions).toBe(0);
    });
});

describe('calculateAdditionalStats', () => {
    it('counts officers by category and derives the staffing percentage', () => {
        const users = [
            person('1-й взвод', StatusExcel.POSITIONS_INFANTRY, 'Оф'),
            person('1-й взвод', StatusExcel.POSITIONS_INFANTRY, 'Сол'),
            person('1-й взвод', StatusExcel.ABSENT_VLK, 'Сол'),
        ];

        const stats = UnitStatsCalculator.calculateAdditionalStats(users, {
            total: 6,
            officer: 1,
            soldier: 5,
        });

        expect(stats.actualTotal).toBe(3);
        expect(stats.actualOfficers).toBe(1);
        expect(stats.actualSoldiers).toBe(2);
        expect(stats.staffingPercent).toBe('50%'); // 3 of 6
        expect(stats.presentTotal).toBe(2); // one person is at ВЛК
        expect(stats.inCombatNow).toBe(2);
    });

    it('does not divide by zero when nothing is planned', () => {
        const stats = UnitStatsCalculator.calculateAdditionalStats([], { total: 0, officer: 0, soldier: 0 });
        expect(stats.staffingPercent).toBe('0');
        expect(stats.presentPercent).toBe('0');
    });
});

describe('generateFullReport', () => {
    const users = [
        person('Управління роти', StatusExcel.MANAGEMENT, 'Оф'),
        person('Управління роти', StatusExcel.SUPPLY_GENERAL),
        person('1-й взвод', StatusExcel.POSITIONS_INFANTRY),
        person('1-й взвод', StatusExcel.POSITIONS_INFANTRY),
        person('1-й взвод', StatusExcel.ABSENT_VLK),
        person('2-й взвод', StatusExcel.POSITIONS_CREW),
        person('3-й взвод', StatusExcel.ABSENT_SZO),
    ];

    it('reports planned numbers from the staffing table', () => {
        const report = UnitStatsCalculator.generateFullReport(users, []);

        expect(report['Управління роти'].plannedTotal).toBe(10);
        expect(report['Управління роти'].plannedOfficer).toBe(3);
        expect(report['1-й взвод'].plannedTotal).toBe(30);
        expect(report['ВСЬОГО'].plannedTotal).toBe(100);
        expect(report['ВСЬОГО'].plannedOfficer).toBe(6);
        expect(report['ВСЬОГО'].plannedSoldier).toBe(94);
    });

    it('counts people of each unit separately', () => {
        const report = UnitStatsCalculator.generateFullReport(users, []);

        expect(report['1-й взвод'].actualTotal).toBe(3);
        expect(report['1-й взвод'].positionsInfantry).toBe(2);
        expect(report['1-й взвод'].absentVLK).toBe(1);
        expect(report['2-й взвод'].actualTotal).toBe(1);
        expect(report['3-й взвод'].absentSZO).toBe(1);
    });

    it('computes the share of people available against the staffing table', () => {
        const report = UnitStatsCalculator.generateFullReport(users, []);
        // 2 of 10 in the company HQ are in the unit now
        expect(report['Управління роти'].percentNowCurrent).toBe('20%');
        expect(report['ВСЬОГО'].percentNowCurrent).toBe('5%'); // 5 of 100
    });

    it('shows 0% instead of failing when nothing is planned for a unit', () => {
        UnitStatsCalculator.setPlannedTotals({});
        const report = UnitStatsCalculator.generateFullReport(users, []);
        expect(report['1-й взвод'].plannedTotal).toBe(0);
        expect(report['1-й взвод'].percentNowCurrent).toBe('0%');
    });

    it('counts people of unknown units in ВСЬОГО but in no unit row', () => {
        // Documents current behaviour: a person whose unit is not one of the four known
        // subunits is invisible in the unit rows, yet still counted in the summary row.
        const report = UnitStatsCalculator.generateFullReport(
            [...users, person('Прикомандировані', StatusExcel.POSITIONS_INFANTRY)],
            [],
        );
        const unitSum = ['Управління роти', '1-й взвод', '2-й взвод', '3-й взвод'].reduce(
            (sum, unit) => sum + report[unit].actualTotal,
            0,
        );
        expect(unitSum).toBe(7);
        expect(report['ВСЬОГО'].actualTotal).toBe(8);
    });
});
