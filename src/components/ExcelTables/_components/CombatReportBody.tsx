import React from 'react';
import { useUserStore } from '../../../stores/userStore';
import { StatusExcel } from '../../../utils/excelUserStatuses';

// ✅ Count how many users have each soldierStatus
function countStatuses(users: { soldierStatus: string }[]) {
    const counts: Record<string, number> = {};
    for (const u of users) {
        const status = u.soldierStatus;
        counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
}

// ✅ Helper to sum multiple statuses for grouped columns
function sumStatuses(counts: Record<string, number>, statuses: string[]) {
    return statuses.reduce((sum, st) => sum + (counts[st] || 0), 0);
}

// ✅ Mapping table groups → soldierStatus strings
const STATUS_GROUPS = {
    // Positions
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

    // Rotation
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

    // Supply
    supplyAll: [
        StatusExcel.SUPPLY_BD,
        StatusExcel.SUPPLY_ENGINEERING,
        StatusExcel.SUPPLY_LIFE_SUPPORT,
    ],
    supplyBd: [StatusExcel.SUPPLY_BD],
    supplyEng: [StatusExcel.SUPPLY_ENGINEERING],
    supplyLife: [StatusExcel.SUPPLY_LIFE_SUPPORT],

    // Management
    management: [StatusExcel.MANAGEMENT],
    ksp: [StatusExcel.KSP],

    // Non combat
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

    // Absent
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
    const users = useUserStore((s) => s.users); // ✅ users have soldierStatus string
    const counts = countStatuses(users);

    // ✅ Total groups
    const totalPositions = sumStatuses(counts, STATUS_GROUPS.positionsAll);
    const totalRotation = sumStatuses(counts, STATUS_GROUPS.rotationAll);
    const totalSupply = sumStatuses(counts, STATUS_GROUPS.supplyAll);
    const totalManagement = sumStatuses(counts, STATUS_GROUPS.management);
    const totalKsp = sumStatuses(counts, STATUS_GROUPS.ksp);

    const totalNonCombat = sumStatuses(counts, STATUS_GROUPS.nonCombatAll);
    const totalAbsent = sumStatuses(counts, STATUS_GROUPS.absentAll);
    const totalMissing = totalNonCombat + totalAbsent;

    return (
        <tbody>
            <tr className="border-t">
                {/* № */}
                <td style={{ borderRightWidth: '3px' }} className="border border-black">
                    1
                </td>

                {/* ПІДРОЗДІЛИ */}
                <td
                    style={{ borderLeftWidth: '3px', fontWeight: 'bold' }}
                    className="border border-black"
                >
                    1 РОТА
                </td>

                {/* Static штат */}
                <td className="border border-black">20</td>
                <td className="border border-black">5</td>
                <td style={{ borderRightWidth: '3px' }} className="border border-black">
                    15
                </td>

                {/* Укомплектованість */}
                <td className="border border-black">
                    {(((users.length - totalMissing) / users.length) * 100 || 0).toFixed(0)}%
                </td>
                <td className="border border-black">{users.length}</td>
                <td className="border border-black">-</td>
                <td style={{ borderRightWidth: '3px' }} className="border border-black">
                    -
                </td>

                {/* % В НАЯВНОСТІ */}
                <td style={{ borderRightWidth: '3px' }} className="border border-black">
                    {(((users.length - totalMissing) / users.length) * 100 || 0).toFixed(0)}%
                </td>

                {/* В НАЯВНОСТІ всього */}
                <td className="border border-black">{users.length - totalMissing}</td>
                <td className="border border-black">-</td>
                <td style={{ borderRightWidth: '3px' }} className="border border-black">
                    -
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

                {/* Підпорядкування іншій ВЧ + ППД НЕ В РАЙОНІ (static) */}
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
