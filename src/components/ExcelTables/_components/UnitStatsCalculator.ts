// UnitStatsCalculator.ts
import { StatusExcel } from '../../../utils/excelUserStatuses';

export class UnitStatsCalculator {
    // ✅ Static status groups
    static STATUS_GROUPS = {
        positionsAll: [
            StatusExcel.POSITIONS_INFANTRY,
            StatusExcel.POSITIONS_CREW,
            StatusExcel.POSITIONS_CALCULATION,
            StatusExcel.POSITIONS_UAV,
            StatusExcel.POSITIONS_BRONEGROUP,
            StatusExcel.POSITIONS_RESERVE_INFANTRY,
        ],
        positionsInfantry: [StatusExcel.POSITIONS_INFANTRY],
        positionsCrew: [StatusExcel.POSITIONS_CREW],
        positionsCalc: [StatusExcel.POSITIONS_CALCULATION],
        positionsUav: [StatusExcel.POSITIONS_UAV],
        positionsBronegroup: [StatusExcel.POSITIONS_BRONEGROUP],
        positionsReserveInfantry: [StatusExcel.POSITIONS_RESERVE_INFANTRY],
        rotationAll: [
            StatusExcel.ROTATION_INFANTRY,
            StatusExcel.ROTATION_CREW,
            StatusExcel.ROTATION_CALCULATION,
            StatusExcel.ROTATION_UAV,
        ],
        rotationInfantry: [StatusExcel.ROTATION_INFANTRY],
        rotationCrew: [StatusExcel.ROTATION_CREW],
        rotationCalc: [StatusExcel.ROTATION_CALCULATION],
        rotationUav: [StatusExcel.ROTATION_UAV],
        supplyAll: [
            StatusExcel.SUPPLY_BD,
            StatusExcel.SUPPLY_ENGINEERING,
            StatusExcel.SUPPLY_LIFE_SUPPORT,
            StatusExcel.SUPPLY_COMBAT,
            StatusExcel.SUPPLY_GENERAL,
        ],
        supplyBd: [StatusExcel.SUPPLY_BD],
        supplyEng: [StatusExcel.SUPPLY_ENGINEERING],
        supplyLife: [StatusExcel.SUPPLY_LIFE_SUPPORT],
        supplyCombat: [StatusExcel.SUPPLY_COMBAT],
        supplyGeneral: [StatusExcel.SUPPLY_GENERAL],
        management: [StatusExcel.MANAGEMENT],
        ksp: [StatusExcel.KSP],
        nonCombatAll: [
            StatusExcel.NON_COMBAT_ATTACHED_UNITS,
            StatusExcel.NON_COMBAT_TRAINING_NEWCOMERS,
            StatusExcel.NON_COMBAT_NEWCOMERS,
            StatusExcel.NON_COMBAT_HOSPITAL_REFERRAL,
            StatusExcel.NON_COMBAT_EXEMPTED,
            StatusExcel.NON_COMBAT_TREATMENT_ON_SITE,
            StatusExcel.NON_COMBAT_LIMITED_FITNESS,
            StatusExcel.NON_COMBAT_AWAITING_DECISION,
            StatusExcel.NON_COMBAT_REFUSERS,
        ],
        nonCombatAttached: [StatusExcel.NON_COMBAT_ATTACHED_UNITS],
        nonCombatTraining: [StatusExcel.NON_COMBAT_TRAINING_NEWCOMERS],
        nonCombatNewcomers: [StatusExcel.NON_COMBAT_NEWCOMERS],
        nonCombatHospitalReferral: [StatusExcel.NON_COMBAT_HOSPITAL_REFERRAL],
        nonCombatExempted: [StatusExcel.NON_COMBAT_EXEMPTED],
        nonCombatOnSite: [StatusExcel.NON_COMBAT_TREATMENT_ON_SITE],
        nonCombatLimited: [StatusExcel.NON_COMBAT_LIMITED_FITNESS],
        nonCombatDecision: [StatusExcel.NON_COMBAT_AWAITING_DECISION],
        nonCombatRefusers: [StatusExcel.NON_COMBAT_REFUSERS],
        absentAll: [
            StatusExcel.ABSENT_MEDICAL_LEAVE,
            StatusExcel.ABSENT_ANNUAL_LEAVE,
            StatusExcel.ABSENT_FAMILY_LEAVE,
            StatusExcel.ABSENT_TRAINING,
            StatusExcel.ABSENT_BUSINESS_TRIP,
            StatusExcel.ABSENT_ARREST,
            StatusExcel.ABSENT_SZO,
            StatusExcel.ABSENT_HOSPITAL,
            StatusExcel.ABSENT_VLK,
            StatusExcel.ABSENT_300,
            StatusExcel.ABSENT_500,
            StatusExcel.ABSENT_200,
            StatusExcel.ABSENT_HOSPITALIZED,
            StatusExcel.ABSENT_MEDICAL_COMPANY,
            StatusExcel.ABSENT_REHAB_LEAVE,
            StatusExcel.ABSENT_KIA,
            StatusExcel.ABSENT_MIA,
            StatusExcel.ABSENT_WOUNDED,
        ],
        absentMedical: [StatusExcel.ABSENT_MEDICAL_LEAVE],
        absentAnnual: [StatusExcel.ABSENT_ANNUAL_LEAVE],
        absentFamily: [StatusExcel.ABSENT_FAMILY_LEAVE],
        absentTraining: [StatusExcel.ABSENT_TRAINING],
        absentBusinessTrip: [StatusExcel.ABSENT_BUSINESS_TRIP],
        absentArrest: [StatusExcel.ABSENT_ARREST],
        absentSZO: [StatusExcel.ABSENT_SZO],
        absentHospital: [StatusExcel.ABSENT_HOSPITAL, StatusExcel.ABSENT_HOSPITALIZED],
        absentVLK: [StatusExcel.ABSENT_VLK],
        absent300: [StatusExcel.ABSENT_300],
        absent500: [StatusExcel.ABSENT_500],
        absent200: [StatusExcel.ABSENT_200, StatusExcel.ABSENT_KIA],
        absentRehabLeave: [StatusExcel.ABSENT_REHAB_LEAVE],
        absentMedCompany: [StatusExcel.ABSENT_MEDICAL_COMPANY],
        absentMIA: [StatusExcel.ABSENT_MIA],
        absentWounded: [StatusExcel.ABSENT_WOUNDED],
    };

    // ✅ Planned totals reference
    static PLANNED_TOTALS: Record<string, { total: number; officer: number; soldier: number }> = {
        'Управління роти': { total: 11, officer: 3, soldier: 8 },
        '1-й взвод': { total: 34, officer: 1, soldier: 33 },
        '2-й взвод': { total: 34, officer: 1, soldier: 33 },
        '3-й взвод': { total: 34, officer: 1, soldier: 33 },
        ВСЬОГО: { total: 0, officer: 0, soldier: 0 }, // sum later
    };

    // ✅ Utility: get planned totals for 1 unit
    static getPlannedTotals(unitName: string) {
        return this.PLANNED_TOTALS[unitName] || { total: 0, officer: 0, soldier: 0 };
    }

    // ✅ Count how many users have each soldierStatus
    static countStatuses(users: { soldierStatus?: string }[]) {
        const counts: Record<string, number> = {};
        for (const u of users) {
            if (!u.soldierStatus) continue;
            counts[u.soldierStatus] = (counts[u.soldierStatus] || 0) + 1;
        }
        return counts;
    }

    // ✅ Sum multiple statuses for grouped columns
    static sumStatuses(counts: Record<string, number>, statuses: string[]) {
        return statuses.reduce((sum, st) => sum + (counts[st] || 0), 0);
    }

    static normalizeUnitName(name: string) {
        return name
            .replace(/\r?\n|\r/g, ' ') // newlines → space
            .replace(/-й/g, '') // remove "-й" so 2-й → 2
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' '); // collapse multiple spaces
    }

    static filterUsersByUnit(users: any[], unitName: string) {
        // Normalize "2-й взвод" → "2 взвод"
        const normalizedTarget = this.normalizeUnitName(unitName);

        return users.filter((u) => {
            if (!u.unitMain) return false;

            const normalizedUserUnit = this.normalizeUnitName(u.unitMain);

            // ✅ MATCH if startsWith (so "2 взвод" matches "2 взвод 1 відділення")
            return normalizedUserUnit.startsWith(normalizedTarget);
        });
    }

    // ✅ Calculate all STATUS_GROUP fields for a given set of users
    static calculateStatusTotalsExplicit(users: { soldierStatus?: string }[]) {
        const counts = UnitStatsCalculator.countStatuses(users);

        // ... (ALL fields as before, unchanged)
        // [kept same code for positions/rotation/supply/nonCombat/absent]
        // Returns giant object with totalPositions, totalRotation, etc.

        const totalPositions = this.sumStatuses(counts, this.STATUS_GROUPS.positionsAll);
        const positionsInfantry = this.sumStatuses(counts, this.STATUS_GROUPS.positionsInfantry);
        const positionsCrew = this.sumStatuses(counts, this.STATUS_GROUPS.positionsCrew);
        const positionsCalc = this.sumStatuses(counts, this.STATUS_GROUPS.positionsCalc);
        const positionsUav = this.sumStatuses(counts, this.STATUS_GROUPS.positionsUav);
        const positionsBronegroup = this.sumStatuses(
            counts,
            this.STATUS_GROUPS.positionsBronegroup,
        );
        const positionsReserveInfantry = this.sumStatuses(
            counts,
            this.STATUS_GROUPS.positionsReserveInfantry,
        );

        const totalRotation = this.sumStatuses(counts, this.STATUS_GROUPS.rotationAll);
        const rotationInfantry = this.sumStatuses(counts, this.STATUS_GROUPS.rotationInfantry);
        const rotationCrew = this.sumStatuses(counts, this.STATUS_GROUPS.rotationCrew);
        const rotationCalc = this.sumStatuses(counts, this.STATUS_GROUPS.rotationCalc);
        const rotationUav = this.sumStatuses(counts, this.STATUS_GROUPS.rotationUav);

        const totalSupply = this.sumStatuses(counts, this.STATUS_GROUPS.supplyAll);
        const supplyBd = this.sumStatuses(counts, this.STATUS_GROUPS.supplyBd);
        const supplyEng = this.sumStatuses(counts, this.STATUS_GROUPS.supplyEng);
        const supplyLife = this.sumStatuses(counts, this.STATUS_GROUPS.supplyLife);
        const supplyCombat = this.sumStatuses(counts, this.STATUS_GROUPS.supplyCombat);
        const supplyGeneral = this.sumStatuses(counts, this.STATUS_GROUPS.supplyGeneral);

        const totalManagement = this.sumStatuses(counts, this.STATUS_GROUPS.management);
        const totalKsp = this.sumStatuses(counts, this.STATUS_GROUPS.ksp);

        const totalNonCombat = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatAll);
        const nonCombatAttached = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatAttached);
        const nonCombatTraining = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatTraining);
        const nonCombatNewcomers = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatNewcomers);
        const nonCombatHospitalReferral = this.sumStatuses(
            counts,
            this.STATUS_GROUPS.nonCombatHospitalReferral,
        );
        const nonCombatExempted = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatExempted);
        const nonCombatOnSite = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatOnSite);
        const nonCombatLimited = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatLimited);
        const nonCombatDecision = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatDecision);
        const nonCombatRefusers = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatRefusers);

        const totalAbsent = this.sumStatuses(counts, this.STATUS_GROUPS.absentAll);
        const absentMedical = this.sumStatuses(counts, this.STATUS_GROUPS.absentMedical);
        const absentAnnual = this.sumStatuses(counts, this.STATUS_GROUPS.absentAnnual);
        const absentFamily = this.sumStatuses(counts, this.STATUS_GROUPS.absentFamily);
        const absentTraining = this.sumStatuses(counts, this.STATUS_GROUPS.absentTraining);
        const absentBusinessTrip = this.sumStatuses(counts, this.STATUS_GROUPS.absentBusinessTrip);
        const absentArrest = this.sumStatuses(counts, this.STATUS_GROUPS.absentArrest);
        const absentSZO = this.sumStatuses(counts, this.STATUS_GROUPS.absentSZO);
        const absentHospital = this.sumStatuses(counts, this.STATUS_GROUPS.absentHospital);
        const absentVLK = this.sumStatuses(counts, this.STATUS_GROUPS.absentVLK);
        const absent300 = this.sumStatuses(counts, this.STATUS_GROUPS.absent300);
        const absent500 = this.sumStatuses(counts, this.STATUS_GROUPS.absent500);
        const absent200 = this.sumStatuses(counts, this.STATUS_GROUPS.absent200);
        const absentRehabLeave = this.sumStatuses(counts, this.STATUS_GROUPS.absentRehabLeave);
        const absentMedCompany = this.sumStatuses(counts, this.STATUS_GROUPS.absentMedCompany);
        const absentMIA = this.sumStatuses(counts, this.STATUS_GROUPS.absentMIA);
        const absentWounded = this.sumStatuses(counts, this.STATUS_GROUPS.absentWounded);

        const totalMissing = totalNonCombat + totalAbsent;

        return {
            totalPositions,
            positionsInfantry,
            positionsCrew,
            positionsCalc,
            positionsUav,
            positionsBronegroup,
            positionsReserveInfantry,

            totalRotation,
            rotationInfantry,
            rotationCrew,
            rotationCalc,
            rotationUav,

            totalSupply,
            supplyBd,
            supplyEng,
            supplyLife,
            supplyCombat,
            supplyGeneral,

            totalManagement,
            totalKsp,

            totalNonCombat,
            nonCombatAttached,
            nonCombatTraining,
            nonCombatNewcomers,
            nonCombatHospitalReferral,
            nonCombatExempted,
            nonCombatOnSite,
            nonCombatLimited,
            nonCombatDecision,
            nonCombatRefusers,

            totalAbsent,
            absentMedical,
            absentAnnual,
            absentFamily,
            absentTraining,
            absentBusinessTrip,
            absentArrest,
            absentSZO,
            absentHospital,
            absentVLK,
            absent300,
            absent500,
            absent200,
            absentRehabLeave,
            absentMedCompany,
            absentMIA,
            absentWounded,

            totalMissing,
        };
    }

    static generateFullReport(users: any[], shtatniPosady: any[]) {
        const UNITS = ['Управління роти', '1-й взвод', '2-й взвод', '3-й взвод', 'ВСЬОГО'];
        const result: Record<string, any> = {};

        for (const unitName of UNITS) {
            if (unitName === 'ВСЬОГО') {
                // sum planned, calculate actual for ALL users
                const plannedSum = Object.keys(this.PLANNED_TOTALS).reduce(
                    (acc, key) => {
                        if (key === 'ВСЬОГО') return acc;
                        const v = this.PLANNED_TOTALS[key];
                        return {
                            total: acc.total + v.total,
                            officer: acc.officer + v.officer,
                            soldier: acc.soldier + v.soldier,
                        };
                    },
                    { total: 0, officer: 0, soldier: 0 },
                );

                const actualGlobal = this.calculateStatusTotalsExplicit(users);

                result[unitName] = {
                    unit: 'ВСЬОГО',
                    plannedTotal: plannedSum.total,
                    plannedOfficer: plannedSum.officer,
                    plannedSoldier: plannedSum.soldier,
                    ...actualGlobal,
                };
            } else {
                const unitUsers = this.filterUsersByUnit(users, unitName);
                const planned = this.getPlannedTotals(unitName);
                const actual = this.calculateStatusTotalsExplicit(unitUsers);

                result[unitName] = {
                    unit: unitName,
                    plannedTotal: planned.total,
                    plannedOfficer: planned.officer,
                    plannedSoldier: planned.soldier,
                    ...actual,
                };
            }
        }

        return result;
    }
}
