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
        onPosition: [StatusExcel.POSITIONS_ON],
        positionsInfantry: [StatusExcel.POSITIONS_INFANTRY],
        positionsCrew: [StatusExcel.POSITIONS_CREW],
        positionsCalc: [StatusExcel.POSITIONS_CALCULATION],
        positionsUav: [StatusExcel.POSITIONS_UAV],
        positionsBronegroup: [StatusExcel.POSITIONS_BRONEGROUP],
        positionsReserveInfantry: [StatusExcel.POSITIONS_RESERVE_INFANTRY],
        crews: [StatusExcel.CREWS],
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
        inCombatNow: [
            StatusExcel.ROTATION_INFANTRY,
            StatusExcel.POSITIONS_BRONEGROUP,
            StatusExcel.POSITIONS_RESERVE_INFANTRY,
            StatusExcel.CREWS,
            StatusExcel.MANAGEMENT,
            StatusExcel.SUPPLY_COMBAT,
            StatusExcel.SUPPLY_GENERAL,
            StatusExcel.NON_COMBAT_TRAINING_NEWCOMERS,
        ],
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
        nonOnBG: [
            StatusExcel.NON_COMBAT_LIMITED_FITNESS,
            StatusExcel.NON_COMBAT_LIMITED_FITNESS_IN_COMBAT,
            StatusExcel.NON_COMBAT_REFUSERS,
            StatusExcel.ABSENT_REHABED_ON,
            StatusExcel.HAVE_OFFER_TO_HOS,
        ],
        nonCombatAttached: [StatusExcel.NON_COMBAT_ATTACHED_UNITS],
        nonCombatTraining: [StatusExcel.NON_COMBAT_TRAINING_NEWCOMERS],
        nonCombatNewcomers: [StatusExcel.NON_COMBAT_NEWCOMERS],
        nonCombatHospitalReferral: [StatusExcel.NON_COMBAT_HOSPITAL_REFERRAL],
        nonCombatExempted: [StatusExcel.NON_COMBAT_EXEMPTED],
        nonCombatOnSite: [StatusExcel.NON_COMBAT_TREATMENT_ON_SITE],
        nonCombatLimited: [StatusExcel.NON_COMBAT_LIMITED_FITNESS],
        nonCombatLimitedInCombat: [StatusExcel.NON_COMBAT_LIMITED_FITNESS_IN_COMBAT],
        nonCombatDecision: [StatusExcel.NON_COMBAT_AWAITING_DECISION],
        nonCombatRefusers: [StatusExcel.NON_COMBAT_REFUSERS],
        haveOfferToJost: [StatusExcel.HAVE_OFFER_TO_HOS],
        absentRehab: [StatusExcel.ABSENT_REHAB],
        absentRehabedOn: [StatusExcel.ABSENT_REHABED_ON],
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
        absentAllAlternative: [
            StatusExcel.ABSENT_VLK,
            StatusExcel.ABSENT_HOSPITAL,
            StatusExcel.ABSENT_MEDICAL_COMPANY,
            StatusExcel.ABSENT_REHAB_LEAVE,
            StatusExcel.ABSENT_REHAB,
            StatusExcel.ABSENT_BUSINESS_TRIP,
            StatusExcel.ABSENT_SZO,
            StatusExcel.ABSENT_WOUNDED,
            StatusExcel.ABSENT_200,
            StatusExcel.ABSENT_MIA,
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
    // === Actual (за списком)
    // const actualTotal = users.length;
    // const actualOfficers = users.filter((u) => u.category?.toLowerCase().includes('оф')).length;
    // const actualSoldiers = actualTotal - actualOfficers;

    // // === % Staffing
    // const staffingPercent =
    //     plannedTotal > 0 ? ((actualTotal / plannedTotal) * 100).toFixed(0) : '0';
    // // === Присутні всі
    // const presentTotal = actualTotal - totalMissing;

    // // === Відсоток присутніх
    // const presentPercent =
    //     actualTotal > 0 ? ((presentTotal / actualTotal) * 100).toFixed(0) : '0';

    // // === Тепер визначаємо присутніх користувачів (відфільтруємо відсутніх)
    // const absentStatuses = [...STATUS_GROUPS.nonCombatAll, ...STATUS_GROUPS.absentAll];

    // const presentUsers = users.filter((u) => !absentStatuses.includes(u.soldierStatus as any));

    // // === Присутні офіцери і солдати окремо
    // const presentTotalOfficer = presentUsers.filter((u) =>
    //     u.category?.toLowerCase().includes('оф'),
    // ).length;

    // const presentTotalSoldier = presentUsers.length - presentTotalOfficer;
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

        // 5. Кількість відсутніх
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

        return {
            actualTotal,
            actualOfficers,
            actualSoldiers,
            staffingPercent,
            presentTotal,
            presentPercent,
            presentTotalOfficer,
            presentTotalSoldier,
        };
    }

    // ✅ Utility: get planned totals for 1 unit
    static getPlannedTotals(unitName: any) {
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

    static filterUsersByUnit(users: any, unitName: string) {
        // Normalize "2-й взвод" → "2 взвод"
        const normalizedTarget = this.normalizeUnitName(unitName);

        return users.filter((u: any) => {
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

        // ------------------ ПОЧАТОК АЛЬТЕРНАТИВОНОГО БЧС ------------------
        // З НИХ ------------------------------------
        const oNPostition = this.sumStatuses(counts, this.STATUS_GROUPS.onPosition); //на позиції
        const positionsBronegroup = this.sumStatuses(
            counts,
            this.STATUS_GROUPS.positionsBronegroup,
        ); //бронегруппа
        const positionsInfantry = this.sumStatuses(counts, this.STATUS_GROUPS.positionsInfantry); // позиції піхоти
        const positionCrews = this.sumStatuses(counts, this.STATUS_GROUPS.crews); //екіпажі
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
        const totalRotation = this.sumStatuses(counts, this.STATUS_GROUPS.rotationAll);
        const rotationInfantry = this.sumStatuses(counts, this.STATUS_GROUPS.rotationInfantry);
        const rotationCrew = this.sumStatuses(counts, this.STATUS_GROUPS.rotationCrew);
        const rotationCalc = this.sumStatuses(counts, this.STATUS_GROUPS.rotationCalc);
        const rotationUav = this.sumStatuses(counts, this.STATUS_GROUPS.rotationUav);

        const totalSupply = this.sumStatuses(counts, this.STATUS_GROUPS.supplyAll);
        const supplyBd = this.sumStatuses(counts, this.STATUS_GROUPS.supplyBd);
        const supplyEng = this.sumStatuses(counts, this.STATUS_GROUPS.supplyEng);
        const supplyLife = this.sumStatuses(counts, this.STATUS_GROUPS.supplyLife);

        const totalKsp = this.sumStatuses(counts, this.STATUS_GROUPS.ksp);

        const totalNonCombat = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatAll);
        const nonCombatAttached = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatAttached);
        const nonCombatTraining = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatTraining);

        const nonCombatHospitalReferral = this.sumStatuses(
            counts,
            this.STATUS_GROUPS.nonCombatHospitalReferral,
        );
        const nonCombatExempted = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatExempted);
        const nonCombatOnSite = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatOnSite);

        const nonCombatDecision = this.sumStatuses(counts, this.STATUS_GROUPS.nonCombatDecision);

        const totalAbsent = this.sumStatuses(counts, this.STATUS_GROUPS.absentAll);
        const absentMedical = this.sumStatuses(counts, this.STATUS_GROUPS.absentMedical);
        const absentAnnual = this.sumStatuses(counts, this.STATUS_GROUPS.absentAnnual);
        const absentFamily = this.sumStatuses(counts, this.STATUS_GROUPS.absentFamily);
        const absentTraining = this.sumStatuses(counts, this.STATUS_GROUPS.absentTraining);
        const absentArrest = this.sumStatuses(counts, this.STATUS_GROUPS.absentArrest);

        const absent300 = this.sumStatuses(counts, this.STATUS_GROUPS.absent300);
        const absent500 = this.sumStatuses(counts, this.STATUS_GROUPS.absent500);

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
            positionCrews,
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

            totalRotation,
            rotationInfantry,
            rotationCrew,
            rotationCalc,
            rotationUav,

            totalSupply,
            supplyBd,
            supplyEng,
            supplyLife,

            totalKsp,

            totalNonCombat,
            nonCombatAttached,
            nonCombatTraining,

            nonCombatHospitalReferral,
            nonCombatExempted,
            nonCombatOnSite,

            nonCombatDecision,

            totalAbsent,
            absentMedical,
            absentAnnual,
            absentFamily,
            absentTraining,

            absentArrest,

            absent300,
            absent500,

            totalMissing,
        };
    }

    static generateFullReport(users: any[], shtatniPosady: any[]) {
        const UNITS = ['Управління роти', '1-й взвод', '2-й взвод', '3-й взвод', 'ВСЬОГО'];
        const result: Record<string, any> = {};

        for (const unitName of UNITS) {
            if (unitName === 'ВСЬОГО') {
                // === Глобальна агрегація по всім підрозділам
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
                const additionalGlobal = this.calculateAdditionalStats(users, plannedSum);

                result[unitName] = {
                    unit: 'ВСЬОГО',
                    plannedTotal: plannedSum.total,
                    plannedOfficer: plannedSum.officer,
                    plannedSoldier: plannedSum.soldier,
                    ...actualGlobal,
                    ...additionalGlobal, // ✅ Глобальна статистика
                };
            } else {
                // === Обробка для кожного підрозділу
                const unitUsers = this.filterUsersByUnit(users, unitName);
                const planned = this.getPlannedTotals(unitName);
                const actual = this.calculateStatusTotalsExplicit(unitUsers);
                const additional = this.calculateAdditionalStats(unitUsers, planned);

                result[unitName] = {
                    unit: unitName,
                    plannedTotal: planned.total,
                    plannedOfficer: planned.officer,
                    plannedSoldier: planned.soldier,
                    ...actual,
                    ...additional, // ✅ Додаткові метрики по підрозділу
                };
            }
        }

        return result;
    }
}
