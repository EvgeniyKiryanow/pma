// UnitStatsCalculator.ts
import { StatusExcel } from '../../../../shared/utils/excelUserStatuses';

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
        // onPosition: [StatusExcel.POSITIONS_ON],
        positionsInfantry: [StatusExcel.POSITIONS_INFANTRY],
        positionsCrew: [StatusExcel.POSITIONS_CREW],
        positionsCalc: [StatusExcel.POSITIONS_CALCULATION],
        positionsUav: [StatusExcel.POSITIONS_UAV],
        positionsBronegroup: [StatusExcel.POSITIONS_BRONEGROUP],
        positionsReserveInfantry: [StatusExcel.POSITIONS_RESERVE_INFANTRY],
        supplyAll: [StatusExcel.SUPPLY_COMBAT, StatusExcel.SUPPLY_GENERAL],
        supplyCombat: [StatusExcel.SUPPLY_COMBAT],
        supplyGeneral: [StatusExcel.SUPPLY_GENERAL],
        management: [StatusExcel.MANAGEMENT],
        inCombatNow: [
            // StatusExcel.POSITIONS_ON,
            StatusExcel.POSITIONS_BRONEGROUP,
            StatusExcel.POSITIONS_INFANTRY,
            StatusExcel.POSITIONS_CREW,
            StatusExcel.POSITIONS_CALCULATION,
            StatusExcel.POSITIONS_UAV,
            StatusExcel.POSITIONS_RESERVE_INFANTRY,
            StatusExcel.MANAGEMENT,
            StatusExcel.SUPPLY_COMBAT,
            StatusExcel.SUPPLY_GENERAL,
            StatusExcel.NON_COMBAT_NEWCOMERS,
            StatusExcel.NON_COMBAT_LIMITED_FITNESS,
            StatusExcel.NON_COMBAT_LIMITED_FITNESS_IN_COMBAT,
            StatusExcel.NON_COMBAT_REFUSERS,
            StatusExcel.ABSENT_REHABED_ON,
            StatusExcel.HAVE_OFFER_TO_HOS,
        ],
        nonCombatAll: [
            StatusExcel.NON_COMBAT_NEWCOMERS,
            StatusExcel.NON_COMBAT_LIMITED_FITNESS,
            StatusExcel.NON_COMBAT_REFUSERS,
        ],
        nonOnBG: [
            StatusExcel.NON_COMBAT_NEWCOMERS,
            StatusExcel.NON_COMBAT_LIMITED_FITNESS,
            StatusExcel.NON_COMBAT_LIMITED_FITNESS_IN_COMBAT,
            StatusExcel.NON_COMBAT_REFUSERS,
            StatusExcel.ABSENT_REHABED_ON,
            StatusExcel.HAVE_OFFER_TO_HOS,
        ],
        nonCombatNewcomers: [StatusExcel.NON_COMBAT_NEWCOMERS],
        nonCombatLimited: [StatusExcel.NON_COMBAT_LIMITED_FITNESS],
        nonCombatLimitedInCombat: [StatusExcel.NON_COMBAT_LIMITED_FITNESS_IN_COMBAT],
        nonCombatRefusers: [StatusExcel.NON_COMBAT_REFUSERS],
        haveOfferToJost: [StatusExcel.HAVE_OFFER_TO_HOS],
        absentRehab: [StatusExcel.ABSENT_REHAB],
        absentRehabedOn: [StatusExcel.ABSENT_REHABED_ON],
        absentAll: [
            StatusExcel.ABSENT_BUSINESS_TRIP,
            StatusExcel.ABSENT_SZO,
            StatusExcel.ABSENT_HOSPITALIZED,
            StatusExcel.ABSENT_MEDICAL_COMPANY,
            StatusExcel.ABSENT_VLK,
            StatusExcel.ABSENT_REHAB_LEAVE,
            StatusExcel.ABSENT_WOUNDED,
            StatusExcel.ABSENT_KIA,
            StatusExcel.ABSENT_MIA,
            StatusExcel.ABSENT_REHAB,
        ],
        absentAllAlternative: [
            StatusExcel.ABSENT_BUSINESS_TRIP,
            StatusExcel.ABSENT_SZO,
            StatusExcel.ABSENT_HOSPITALIZED,
            StatusExcel.ABSENT_MEDICAL_COMPANY,
            StatusExcel.ABSENT_VLK,
            StatusExcel.ABSENT_REHAB_LEAVE,
            StatusExcel.ABSENT_WOUNDED,
            StatusExcel.ABSENT_KIA,
            StatusExcel.ABSENT_MIA,
            StatusExcel.ABSENT_REHAB,
        ],
        absentBusinessTrip: [StatusExcel.ABSENT_BUSINESS_TRIP],
        absentSZO: [StatusExcel.ABSENT_SZO],
        absentHospital: [StatusExcel.ABSENT_HOSPITALIZED],
        absentVLK: [StatusExcel.ABSENT_VLK],
        absent200: [StatusExcel.ABSENT_KIA],
        absentRehabLeave: [StatusExcel.ABSENT_REHAB_LEAVE],
        absentMedCompany: [StatusExcel.ABSENT_MEDICAL_COMPANY],
        absentMIA: [StatusExcel.ABSENT_MIA],
        absentWounded: [StatusExcel.ABSENT_WOUNDED],
    };

    // ✅ Planned totals reference
    // static PLANNED_TOTALS: Record<string, { total: number; officer: number; soldier: number }> = {
    //     'Управління роти': { total: 10, officer: 3, soldier: 7 },
    //     '1-й взвод': { total: 31, officer: 1, soldier: 30 },
    //     '2-й взвод': { total: 31, officer: 1, soldier: 30 },
    //     '3-й взвод': { total: 31, officer: 1, soldier: 30 },
    //     ВСЬОГО: { total: 0, officer: 0, soldier: 0 }, // sum later
    // };

    static calculateAdditionalStats(
        users: any[],
        planned: { total: number; officer: number; soldier: number },
    ) {
        // 1. Загальна кількість користувачів (actualTotal)
        const actualTotal = users.length;

        // 2. Кількість офіцерів
        const actualOfficers = users.filter((u) => u.category?.toLowerCase().includes('оф')).length;

        // 3. Кількість солдатів
        const actualSoldiers = actualTotal - actualOfficers;

        // 4. Відсоток укомплектованості
        const staffingPercent =
            planned.total > 0 ? ((actualTotal / planned.total) * 100).toFixed(0) + '%' : '0';

        // 5. Всі статуси відсутніх
        const totalMissing = this.calculateStatusTotalsExplicit(users).totalMissing;

        // 6. Кількість присутніх
        const presentTotal = actualTotal - totalMissing;

        // 7. Відсоток присутніх
        const presentPercent =
            actualTotal > 0 ? ((presentTotal / actualTotal) * 100).toFixed(0) : '0';

        // 8. Список присутніх користувачів (тобто не absent)
        const absentStatuses = [
            ...this.STATUS_GROUPS.nonCombatAll,
            ...this.STATUS_GROUPS.absentAll,
        ];
        const presentUsers = users.filter((u) => !absentStatuses.includes(u.soldierStatus as any));

        // 9. Присутні офіцери
        const presentTotalOfficer = presentUsers.filter((u) =>
            u.category?.toLowerCase().includes('оф'),
        ).length;

        // 10. Присутні солдати
        const presentTotalSoldier = presentUsers.length - presentTotalOfficer;

        // ✅ 11. Бойові статуси (inCombatNow)
        const inCombatNowUsers = users.filter((u) =>
            this.STATUS_GROUPS.inCombatNow.includes(u.soldierStatus as any),
        );

        const inCombatNow = inCombatNowUsers.length;
        const inCombatNowOfficer = inCombatNowUsers.filter((u) =>
            u.category?.toLowerCase().includes('оф'),
        ).length;
        const inCombatNowSoldier = inCombatNow - inCombatNowOfficer;

        return {
            actualTotal,
            actualOfficers,
            actualSoldiers,
            staffingPercent,
            presentTotal,
            presentPercent,
            presentTotalOfficer,
            presentTotalSoldier,
            inCombatNow,
            inCombatNowOfficer,
            inCombatNowSoldier,
        };
    }

    private static _plannedTotals: Record<
        string,
        { total: number; officer: number; soldier: number }
    > = {};

    /** Call this after importing / fetching штатні посади */
    static setPlannedTotals(
        map: Record<string, { total: number; officer: number; soldier: number }>,
    ) {
        this._plannedTotals = map || {};
    }

    static getPlannedTotals(unitName: string) {
        return this._plannedTotals[unitName] || { total: 0, officer: 0, soldier: 0 };
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
            .toLowerCase()
            .replace(/-й/g, '') // '2-й взвод' → '2 взвод'
            .replace(/-/g, ' ') // '1-взвод' → '1 взвод'
            .trim()
            .replace(/\s+/g, ' ');
    }

    static filterUsersByUnit(users: any, unitName: any) {
        const normalizedTarget = this.normalizeUnitName(unitName);

        return users.filter((u: any) => {
            const unitMain = u.unitMain || u.unit || '';
            const parts = unitMain
                .split(/\r?\n|,|;/g)
                .map((p: any) => p.trim())
                .filter(Boolean);

            const normalizedLines = parts.map(this.normalizeUnitName);

            // exact single-line match
            if (normalizedLines.includes(normalizedTarget)) {
                return true;
            }

            // additionally try pairwise combinations: line[i] + ' ' + line[i+1]
            for (let i = 0; i < normalizedLines.length - 1; i++) {
                const combined = `${normalizedLines[i]} ${normalizedLines[i + 1]}`.trim();
                if (combined === normalizedTarget) {
                    return true;
                }
            }

            return false;
        });
    }

    // ✅ Calculate all STATUS_GROUP fields for a given set of users
    static calculateStatusTotalsExplicit(users: { soldierStatus?: string }[]) {
        const counts = UnitStatsCalculator.countStatuses(users);

        // ... (ALL fields as before, unchanged)
        // [kept same code for positions/rotation/supply/nonCombat/absent]
        // Returns giant object with totalPositions, totalRotation, etc.

        // ------------------ ПОЧАТОК АЛЬТЕРНАТИВОНОГО БЧС ------------------
        // З НИХ ------------------------------------
        //     positionsBronegroup: [StatusExcel.POSITIONS_BRONEGROUP],
        // positionsReserveInfantry: //на позиції
        const positionsBronegroup = this.sumStatuses(
            counts,
            this.STATUS_GROUPS.positionsBronegroup,
        ); //бронегруппа
        const positionsInfantry = this.sumStatuses(counts, this.STATUS_GROUPS.positionsInfantry); // позиції піхоти
        const oNPostition = positionsInfantry + positionsBronegroup;
        const positionsCalc = this.sumStatuses(counts, this.STATUS_GROUPS.positionsCalc); //позиція розрахунку
        const positionsUav = this.sumStatuses(counts, this.STATUS_GROUPS.positionsUav); // позиція БПЛА
        const positionsReserveInfantry = this.sumStatuses(
            counts,
            this.STATUS_GROUPS.positionsReserveInfantry,
        ); // резерв піхоти
        const totalManagement = this.sumStatuses(counts, this.STATUS_GROUPS.management); //управління
        const supplyCombat = this.sumStatuses(counts, this.STATUS_GROUPS.supplyCombat); // бойове запеспечення
        const supplyGeneral = this.sumStatuses(counts, this.STATUS_GROUPS.supplyGeneral); //забеспечення
        const nonCombatNewcomers = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatNewcomers); //новоприбулі

        const nonCombatLimited = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatLimited); //обмежено придатні
        const nonCombatLimitedInCombat = this.sumStatuses(
            counts,
            this.STATUS_GROUPS.nonCombatLimitedInCombat,
        ); //хворі в підрозділі
        const absentRehabedOn = this.sumStatuses(counts, this.STATUS_GROUPS.absentRehabedOn); //Звільняються
        const nonCombatRefusers = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatRefusers); //відмовники
        const haveOfferToJost = this.sumStatuses(counts, this.STATUS_GROUPS.haveOfferToJost); //мають напрвлення на лік влк

        // ВСЬОГО НЕ БГ-------------------
        const nonOnBG = this.sumStatuses(counts, this.STATUS_GROUPS.nonOnBG); //ВСЬОГО НЕ БГ
        // В ПІДРОЗДІЛІ
        const inCombatNow = this.sumStatuses(counts, this.STATUS_GROUPS.inCombatNow); //В ПІДЗОЗДІЛІ

        // ВІДСУТНІ ------------------------------------
        const absentVLK = this.sumStatuses(counts, this.STATUS_GROUPS.absentVLK); //ВЛК
        const absentHospital = this.sumStatuses(counts, this.STATUS_GROUPS.absentHospital); //шпиталь лікарня
        const absentMedCompany = this.sumStatuses(counts, this.STATUS_GROUPS.absentMedCompany); //мед рота
        const absentRehabLeave = this.sumStatuses(counts, this.STATUS_GROUPS.absentRehabLeave); //відпустка реабілітація
        const absentRehab = this.sumStatuses(counts, this.STATUS_GROUPS.absentRehab); //відпустка
        const absentBusinessTrip = this.sumStatuses(counts, this.STATUS_GROUPS.absentBusinessTrip); //відрядження
        const absentSZO = this.sumStatuses(counts, this.STATUS_GROUPS.absentSZO); //CЗЧ
        const absentWounded = this.sumStatuses(counts, this.STATUS_GROUPS.absentWounded); //поранені
        const absent200 = this.sumStatuses(counts, this.STATUS_GROUPS.absent200); //загиблі
        const absentMIA = this.sumStatuses(counts, this.STATUS_GROUPS.absentMIA); //зниклі безвісті
        //ВСЬОГО ВІДСУТНІХ ------------------------------------
        const absentAllAlternative = this.sumStatuses(
            counts,
            this.STATUS_GROUPS.absentAllAlternative,
        ); //ВСЬОГО ВІДСУТНІХ ------------------------------------
        const totalPositions = this.sumStatuses(counts, this.STATUS_GROUPS.positionsAll);
        const positionsCrew = this.sumStatuses(counts, this.STATUS_GROUPS.positionsCrew);

        // ------------------ КІНЕЦЬ АЛЬТЕРНАТИВОНОГО БЧС ------------------

        const totalNonCombat = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatAll);

        const totalAbsent = this.sumStatuses(counts, this.STATUS_GROUPS.absentAll);

        const totalMissing = totalNonCombat + totalAbsent;

        return {
            haveOfferToJost,
            nonCombatRefusers,
            absentRehabedOn,
            nonCombatLimitedInCombat,
            nonCombatLimited,
            nonCombatNewcomers,
            supplyGeneral,
            supplyCombat,
            totalManagement,

            positionsReserveInfantry,
            positionsBronegroup,
            positionsInfantry,
            oNPostition,
            inCombatNow,
            nonOnBG,
            positionsUav,
            positionsCalc,
            positionsCrew,
            totalPositions,
            absentAllAlternative,
            absentMIA,
            absent200,
            absentWounded,
            absentSZO,
            absentBusinessTrip,
            absentRehab,
            absentRehabLeave,
            absentMedCompany,
            absentHospital,
            absentVLK,
            totalAbsent,
            totalMissing,
        };
    }

    static generateFullReport(users: any[], shtatniPosady: any[]) {
        const UNITS = ['Управління роти', '1-й взвод', '2-й взвод', '3-й взвод', 'ВСЬОГО'];
        const result: Record<string, any> = {};

        for (const unitName of UNITS) {
            if (unitName === 'ВСЬОГО') {
                // === Глобальна агрегація по всім підрозділам
                const plannedSum = Object.keys(this._plannedTotals).reduce(
                    (acc, key) => {
                        if (key === 'ВСЬОГО') return acc;
                        const v = this._plannedTotals[key];
                        return {
                            total: acc.total + v.total,
                            officer: acc.officer + v.officer,
                            soldier: acc.soldier + v.soldier,
                        };
                    },
                    { total: 0, officer: 0, soldier: 0 },
                );

                const actualGlobal = this.calculateStatusTotalsExplicit(users);
                const additionalGlobal = this.calculateAdditionalStats(users, plannedSum);

                // ✅ Add percentNowCurrent for ВСЬОГО
                const percentNowCurrent =
                    plannedSum.total > 0
                        ? ((actualGlobal.inCombatNow / plannedSum.total) * 100).toFixed(0) + '%'
                        : '0%';

                result[unitName] = {
                    unit: 'ВСЬОГО',
                    plannedTotal: plannedSum.total,
                    plannedOfficer: plannedSum.officer,
                    plannedSoldier: plannedSum.soldier,
                    percentNowCurrent, // ✅ added here
                    ...actualGlobal,
                    ...additionalGlobal,
                };
            } else {
                const unitUsers = this.filterUsersByUnit(users, unitName);
                const planned = this.getPlannedTotals(unitName);
                const actual = this.calculateStatusTotalsExplicit(unitUsers);
                const additional = this.calculateAdditionalStats(unitUsers, planned);

                // ✅ NEW: Add current inCombat percentage
                const percentNowCurrent =
                    planned.total > 0
                        ? ((actual.inCombatNow / planned.total) * 100).toFixed(0) + '%'
                        : '0%';
                // console.log(
                //     (result[unitName] = {
                //         unit: unitName,
                //         plannedTotal: planned.total,
                //         plannedOfficer: planned.officer,
                //         plannedSoldier: planned.soldier,
                //         percentNowCurrent,
                //         ...actual,
                //         ...additional,
                //     }),
                // );
                result[unitName] = {
                    unit: unitName,
                    plannedTotal: planned.total,
                    plannedOfficer: planned.officer,
                    plannedSoldier: planned.soldier,
                    percentNowCurrent,
                    ...actual,
                    ...additional,
                };
            }
        }

        return result;
    }
}
