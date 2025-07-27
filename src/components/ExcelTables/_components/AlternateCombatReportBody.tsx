import React, { useEffect, useMemo } from 'react';
import { useUserStore } from '../../../stores/userStore';
import { useShtatniStore } from '../../../stores/useShtatniStore';
import { StatusExcel } from '../../../utils/excelUserStatuses';

// ✅ Count how many users have each soldierStatus
function countStatuses(users: { soldierStatus?: string }[]) {
    const counts: Record<string, number> = {};
    for (const u of users) {
        if (!u.soldierStatus) continue;
        counts[u.soldierStatus] = (counts[u.soldierStatus] || 0) + 1;
    }
    return counts;
}

// ✅ Helper to sum multiple statuses for grouped columns
function sumStatuses(counts: Record<string, number>, statuses: string[]) {
    return statuses.reduce((sum, st) => sum + (counts[st] || 0), 0);
}

// ✅ STATUS GROUPS same as before
export const STATUS_GROUPS = {
    // === Позиції (всі) ===
    positionsAll: [
        StatusExcel.POSITIONS_INFANTRY,
        StatusExcel.POSITIONS_CREW,
        StatusExcel.POSITIONS_CALCULATION,
        StatusExcel.POSITIONS_UAV,
        StatusExcel.POSITIONS_BRONEGROUP, // ✅ new
        StatusExcel.POSITIONS_RESERVE_INFANTRY, // ✅ new
    ],
    positionsInfantry: [StatusExcel.POSITIONS_INFANTRY],
    positionsCrew: [StatusExcel.POSITIONS_CREW],
    positionsCalc: [StatusExcel.POSITIONS_CALCULATION],
    positionsUav: [StatusExcel.POSITIONS_UAV],
    positionsBronegroup: [StatusExcel.POSITIONS_BRONEGROUP],
    positionsReserveInfantry: [StatusExcel.POSITIONS_RESERVE_INFANTRY],

    // === Ротація ===
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

    // === Забезпечення ===
    supplyAll: [
        StatusExcel.SUPPLY_BD,
        StatusExcel.SUPPLY_ENGINEERING,
        StatusExcel.SUPPLY_LIFE_SUPPORT,
        StatusExcel.SUPPLY_COMBAT, // ✅ new
        StatusExcel.SUPPLY_GENERAL, // ✅ new
    ],
    supplyBd: [StatusExcel.SUPPLY_BD],
    supplyEng: [StatusExcel.SUPPLY_ENGINEERING],
    supplyLife: [StatusExcel.SUPPLY_LIFE_SUPPORT],
    supplyCombat: [StatusExcel.SUPPLY_COMBAT],
    supplyGeneral: [StatusExcel.SUPPLY_GENERAL],

    // === Управління ===
    management: [StatusExcel.MANAGEMENT],
    ksp: [StatusExcel.KSP],

    // === НЕ БГ (non combat) ===
    nonCombatAll: [
        StatusExcel.NON_COMBAT_ATTACHED_UNITS,
        StatusExcel.NON_COMBAT_TRAINING_NEWCOMERS,
        StatusExcel.NON_COMBAT_NEWCOMERS, // ✅ new
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

    // === ВІДСУТНІ ===
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
        StatusExcel.ABSENT_HOSPITALIZED, // ✅ new
        StatusExcel.ABSENT_MEDICAL_COMPANY, // ✅ new
        StatusExcel.ABSENT_REHAB_LEAVE, // ✅ new
        StatusExcel.ABSENT_KIA, // ✅ new
        StatusExcel.ABSENT_MIA, // ✅ new
        StatusExcel.ABSENT_WOUNDED, // ✅ new
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
    absent200: [StatusExcel.ABSENT_200, StatusExcel.ABSENT_KIA], // ✅ merge Загиблі + 200
    absentRehabLeave: [StatusExcel.ABSENT_REHAB_LEAVE],
    absentMedCompany: [StatusExcel.ABSENT_MEDICAL_COMPANY],
    absentMIA: [StatusExcel.ABSENT_MIA],
    absentWounded: [StatusExcel.ABSENT_WOUNDED],
};

export function AlternateCombatReportBody() {
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
        presentTotal,
        presentTotalOfficer,
        presentTotalSoldier,
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
        const plannedSoldiers = plannedTotal - plannedOfficers;

        // === Actual (за списком)
        const actualTotal = users.length;
        const actualOfficers = users.filter((u) => u.category?.toLowerCase().includes('оф')).length;
        const actualSoldiers = actualTotal - actualOfficers;

        // === % Staffing (укоплектованість)
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
        const presentPercent =
            actualTotal > 0 ? ((presentTotal / actualTotal) * 100).toFixed(0) : '0';

        const absentStatuses = [...STATUS_GROUPS.nonCombatAll, ...STATUS_GROUPS.absentAll];
        const presentUsers = users.filter((u) => !absentStatuses.includes(u.soldierStatus as any));

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
            presentTotal,
            presentTotalOfficer,
            presentTotalSoldier,
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

    const SUBUNITS = [
        'Управління роти',
        '1-й взвод',
        '2-й взвод',
        '3-й взвод',
        'ВСЬОГО',
        'Прикомандировані',
    ];

    return (
        <tbody>
            {SUBUNITS.map((name, index) => (
                <tr key={index} className="border-t">
                    {/* === № column === */}
                    <td
                        style={{ borderRightWidth: '2px' }}
                        className="border border-black text-center"
                    >
                        {index + 1}
                    </td>

                    {/* === ПІДРОЗДІЛ === */}
                    <td
                        style={{ borderWidth: '2px', borderRightWidth: '2px', fontWeight: 'bold' }}
                        className="border border-black"
                    >
                        {name}
                    </td>

                    {/* === ЗА ШТАТОМ === */}
                    <td className="border border-black">{plannedTotal}</td>
                    <td className="border border-black">{plannedOfficers}</td>
                    <td style={{ borderRightWidth: '2px' }} className="border border-black">
                        {plannedSoldiers}
                    </td>

                    {/* УКОМПЛЕКТОВАНІСТЬ*/}
                    <td style={{ borderRightWidth: '2px' }} className="border border-black">
                        0
                    </td>

                    {/* === ЗА СПИСКОМ === */}
                    <td className="border border-black">{actualTotal}</td>
                    <td className="border border-black">{actualOfficers}</td>
                    <td style={{ borderRightWidth: '2px' }} className="border border-black">
                        {actualSoldiers}
                    </td>

                    {/* === В НАЯВНОСТІ %=== */}
                    <td style={{ borderRightWidth: '2px' }} className="border border-black">
                        0
                    </td>

                    {/* === В НАЯВНОСТІ === */}
                    <td style={{ backgroundColor: '#f8da78' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#f8da78' }} className="border border-black">
                        0
                    </td>
                    <td
                        style={{ backgroundColor: '#f8da78', borderRightWidth: '2px' }}
                        className="border border-black"
                    >
                        0
                    </td>

                    {/* З НИХ */}
                    <td style={{ backgroundColor: '#9fce63' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#d7dce3' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#d7dce3' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#eab38a' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#eab38a' }} className="border border-black">
                        {totalSupply}
                    </td>
                    <td style={{ backgroundColor: '#eab38a' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#eab38a' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#eab38a' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#eab38a' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#eab38a' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#eab38a' }} className="border border-black">
                        0
                    </td>

                    {/* === обмежено придатні  === */}
                    <td style={{ backgroundColor: '#f9da77' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#f9da77' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#f9da77' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#f9da77' }} className="border border-black" />
                    <td
                        style={{ backgroundColor: '#f9da77', borderRightWidth: '2px' }}
                        className="border border-black"
                    >
                        0
                    </td>

                    {/* === НЕ БГ === */}
                    <td
                        style={{ backgroundColor: '#b89230', borderRightWidth: '2px' }}
                        className="border border-black"
                    >
                        0
                    </td>

                    {/* В ПІДРОЗДІЛІ */}
                    <td style={{ borderRightWidth: '2px' }} className="border border-black">
                        0
                    </td>

                    {/* ВІДСУТНІ */}
                    <td style={{ backgroundColor: '#eab38a' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#eab38a' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#eab38a' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#fcf2cf' }} className="border border-black" />
                    <td style={{ backgroundColor: '#fcf2cf' }} className="border border-black">
                        0
                    </td>
                    <td style={{ backgroundColor: '#fcf2cf' }} className="border border-black" />
                    <td style={{ backgroundColor: '#fcf2cf' }} className="border border-black">
                        0
                    </td>
                    <td className="border border-black">0</td>
                    <td className="border border-black">0</td>
                    <td style={{ borderRightWidth: '2px' }} className="border border-black">
                        0
                    </td>

                    {/* ВСЬОГО ВІДСУТНІХ */}
                    <td style={{ borderRightWidth: '2px' }} className="border border-black">
                        0
                    </td>
                </tr>
            ))}
        </tbody>
    );
}
