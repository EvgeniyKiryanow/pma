import React, { useEffect, useMemo } from 'react';
import { useUserStore } from '../../../stores/userStore';
import { useShtatniStore } from '../../../stores/useShtatniStore';
import { StatusExcel } from '../../../utils/excelUserStatuses';

// ✅ Count how many users have each soldierStatus
function countStatuses(users: { soldierStatus?: string }[]) {
    const counts: Record<string, number> = {};
    for (const u of users) {
        if (!u.soldierStatus) continue; // skip if no status
        counts[u.soldierStatus] = (counts[u.soldierStatus] || 0) + 1;
    }
    return counts;
}

// ✅ Helper to sum multiple statuses for grouped columns
function sumStatuses(counts: Record<string, number>, statuses: string[]) {
    return statuses.reduce((sum, st) => sum + (counts[st] || 0), 0);
}

// ✅ Mapping table groups → soldierStatus strings
const STATUS_GROUPS = {
    positionsAll: [
        StatusExcel.POSITIONS_INFANTRY,
        StatusExcel.POSITIONS_CREW,
        StatusExcel.POSITIONS_CALCULATION,
        StatusExcel.POSITIONS_UAV,
    ],
    positionsInfantry: [StatusExcel.POSITIONS_INFANTRY],
    positionsCrew: [StatusExcel.POSITIONS_CREW],
    positionsCalc: [StatusExcel.POSITIONS_CALCULATION],
    positionsUav: [StatusExcel.POSITIONS_UAV],

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
    ],
    supplyBd: [StatusExcel.SUPPLY_BD],
    supplyEng: [StatusExcel.SUPPLY_ENGINEERING],
    supplyLife: [StatusExcel.SUPPLY_LIFE_SUPPORT],

    management: [StatusExcel.MANAGEMENT],
    ksp: [StatusExcel.KSP],

    nonCombatAll: [
        StatusExcel.NON_COMBAT_ATTACHED_UNITS,
        StatusExcel.NON_COMBAT_TRAINING_NEWCOMERS,
        StatusExcel.NON_COMBAT_HOSPITAL_REFERRAL,
        StatusExcel.NON_COMBAT_EXEMPTED,
        StatusExcel.NON_COMBAT_TREATMENT_ON_SITE,
        StatusExcel.NON_COMBAT_LIMITED_FITNESS,
        StatusExcel.NON_COMBAT_AWAITING_DECISION,
        StatusExcel.NON_COMBAT_REFUSERS,
    ],
    nonCombatAttached: [StatusExcel.NON_COMBAT_ATTACHED_UNITS],
    nonCombatTraining: [StatusExcel.NON_COMBAT_TRAINING_NEWCOMERS],
    nonCombatHospital: [StatusExcel.NON_COMBAT_HOSPITAL_REFERRAL],
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
    ],
    absentMedical: [StatusExcel.ABSENT_MEDICAL_LEAVE],
    absentAnnual: [StatusExcel.ABSENT_ANNUAL_LEAVE],
    absentFamily: [StatusExcel.ABSENT_FAMILY_LEAVE],
    absentTraining: [StatusExcel.ABSENT_TRAINING],
    absentBusinessTrip: [StatusExcel.ABSENT_BUSINESS_TRIP],
    absentArrest: [StatusExcel.ABSENT_ARREST],
    absentSZO: [StatusExcel.ABSENT_SZO],
    absentHospital: [StatusExcel.ABSENT_HOSPITAL],
    absentVLK: [StatusExcel.ABSENT_VLK],
    absent300: [StatusExcel.ABSENT_300],
    absent500: [StatusExcel.ABSENT_500],
    absent200: [StatusExcel.ABSENT_200],
};

export function CombatReportBody() {
    const { fetchAll } = useShtatniStore();
    const { fetchUsers } = useUserStore();

    useEffect(() => {
        fetchAll();
        fetchUsers();
    }, []);
    const users = useUserStore((s) => s.users);
    const shtatniPosady = useShtatniStore((s) => s.shtatniPosady);

    const {
        plannedTotal,
        plannedOfficers,
        plannedSoldiers,
        actualTotal,
        actualOfficers,
        actualSoldiers,
        staffingPercent,
        presentPercent,
        presentTotalSoldier,
        presentTotalOfficer,
        presentTotal,
        counts,
        totalPositions,
        totalRotation,
        totalSupply,
        totalManagement,
        totalKsp,
        totalNonCombat,
        totalAbsent,
        totalMissing,
    } = useMemo(() => {
        // === Planned (за штатом)
        const plannedTotal = shtatniPosady.length;
        const plannedOfficers = shtatniPosady.filter((p) =>
            p.category?.toLowerCase().includes('оф'),
        ).length;
        // === Planned
        const plannedSoldiers = plannedTotal - plannedOfficers;

        // === Actual (за списком)
        const actualTotal = users.length;
        const actualOfficers = users.filter((u) => u.category?.toLowerCase().includes('оф')).length;
        const actualSoldiers = actualTotal - actualOfficers;

        // === % Staffing
        const staffingPercent =
            plannedTotal > 0 ? ((actualTotal / plannedTotal) * 100).toFixed(0) : '0';

        // === Status counts
        const counts = countStatuses(users);

        const totalPositions = sumStatuses(counts, STATUS_GROUPS.positionsAll);
        const totalRotation = sumStatuses(counts, STATUS_GROUPS.rotationAll);
        const totalSupply = sumStatuses(counts, STATUS_GROUPS.supplyAll);
        const totalManagement = sumStatuses(counts, STATUS_GROUPS.management);
        const totalKsp = sumStatuses(counts, STATUS_GROUPS.ksp);

        const totalNonCombat = sumStatuses(counts, STATUS_GROUPS.nonCombatAll);
        const totalAbsent = sumStatuses(counts, STATUS_GROUPS.absentAll);
        const totalMissing = totalNonCombat + totalAbsent;

        // === Присутні всі
        const presentTotal = actualTotal - totalMissing;

        // === Відсоток присутніх
        const presentPercent =
            actualTotal > 0 ? ((presentTotal / actualTotal) * 100).toFixed(0) : '0';

        // === Тепер визначаємо присутніх користувачів (відфільтруємо відсутніх)
        const absentStatuses = [...STATUS_GROUPS.nonCombatAll, ...STATUS_GROUPS.absentAll];

        const presentUsers = users.filter((u) => !absentStatuses.includes(u.soldierStatus as any));

        // === Присутні офіцери і солдати окремо
        const presentTotalOfficer = presentUsers.filter((u) =>
            u.category?.toLowerCase().includes('оф'),
        ).length;

        const presentTotalSoldier = presentUsers.length - presentTotalOfficer;
        return {
            plannedTotal,
            plannedOfficers,
            plannedSoldiers,
            actualTotal,
            actualOfficers,
            actualSoldiers,
            staffingPercent,
            presentPercent,
            presentTotalSoldier,
            presentTotalOfficer,
            presentTotal,
            counts,
            totalPositions,
            totalRotation,
            totalSupply,
            totalManagement,
            totalKsp,
            totalNonCombat,
            totalAbsent,
            totalMissing,
        };
    }, [users, shtatniPosady]);

    return (
        <tbody>
            <tr className="border-t">
                {/* № */}
                <td style={{ borderRightWidth: '3px' }} className="border border-black text-center">
                    1
                </td>

                {/* ПІДРОЗДІЛ */}
                <td
                    style={{ borderLeftWidth: '3px', fontWeight: 'bold' }}
                    className="border border-black"
                >
                    151 ОМБр
                </td>

                {/* === ЗА ШТАТОМ === */}
                <td className="border border-black">{plannedTotal}</td>
                <td className="border border-black">{plannedOfficers}</td>
                <td style={{ borderRightWidth: '3px' }} className="border border-black">
                    {plannedSoldiers}
                </td>

                {/* === ЗА СПИСКОМ === */}
                <td className="border border-black">{staffingPercent}%</td>
                <td className="border border-black">{actualTotal}</td>
                <td className="border border-black">{actualOfficers}</td>
                <td style={{ borderRightWidth: '3px' }} className="border border-black">
                    {actualSoldiers}
                </td>

                {/* === % В НАЯВНОСТІ === */}
                <td style={{ borderRightWidth: '3px' }} className="border border-black">
                    {presentPercent}%
                </td>

                {/* === В НАЯВНОСТІ ВСЬОГО === */}
                <td className="border border-black">{presentTotal}</td>
                <td className="border border-black">{presentTotalOfficer}</td>
                <td style={{ borderRightWidth: '3px' }} className="border border-black">
                    {presentTotalSoldier}
                </td>

                {/* === На позиціях === */}
                <td className="border border-black">{totalPositions}</td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.positionsInfantry)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.positionsCrew)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.positionsCalc)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.positionsUav)}
                </td>

                {/* === Ротація === */}
                <td className="border border-black">{totalRotation}</td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.rotationInfantry)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.rotationCrew)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.rotationCalc)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.rotationUav)}
                </td>

                {/* === Забезпечення === */}
                <td className="border border-black">{totalSupply}</td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.supplyBd)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.supplyEng)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.supplyLife)}
                </td>

                {/* === Управління === */}
                <td className="border border-black">{totalManagement}</td>
                <td style={{ borderRightWidth: '3px' }} className="border border-black">
                    {totalKsp}
                </td>

                {/* === не БГ === */}
                <td className="border border-black">{totalNonCombat}</td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.nonCombatAttached)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.nonCombatTraining)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.nonCombatHospital)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.nonCombatExempted)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.nonCombatOnSite)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.nonCombatLimited)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.nonCombatDecision)}
                </td>
                <td style={{ borderRightWidth: '3px' }} className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.nonCombatRefusers)}
                </td>

                {/* Підпорядкування іншій ВЧ + ППД НЕ В РАЙОНІ */}
                <td className="border border-black">0</td>
                <td style={{ borderRightWidth: '3px' }} className="border border-black">
                    0
                </td>

                {/* === ВІДСУТНІСТЬ ВСЬОГО === */}
                <td className="border border-black">{totalMissing}</td>

                {/* === Відсутні (детально) === */}
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.absentMedical)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.absentAnnual)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.absentFamily)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.absentTraining)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.absentBusinessTrip)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.absentArrest)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.absentSZO)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.absentHospital)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.absentVLK)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.absent300)}
                </td>
                <td className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.absent500)}
                </td>
                <td style={{ borderRightWidth: '3px' }} className="border border-black">
                    {sumStatuses(counts, STATUS_GROUPS.absent200)}
                </td>
            </tr>
        </tbody>
    );
}
