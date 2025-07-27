import { StatusExcel } from '../utils/excelUserStatuses';

export default function classifyStatusForReport(status?: string) {
    if (!status) return { statusInArea: '', absenceReason: '' };

    // ✅ IN-AREA (combat / rotation / supply / mgmt)
    const inAreaStatuses = [
        // Combat positions
        StatusExcel.POSITIONS_INFANTRY,
        StatusExcel.POSITIONS_CREW,
        StatusExcel.POSITIONS_CALCULATION,
        StatusExcel.POSITIONS_UAV,
        StatusExcel.POSITIONS_BRONEGROUP,
        StatusExcel.POSITIONS_RESERVE_INFANTRY,

        // Rotation
        StatusExcel.ROTATION_INFANTRY,
        StatusExcel.ROTATION_CREW,
        StatusExcel.ROTATION_CALCULATION,
        StatusExcel.ROTATION_UAV,

        // Supply & Mgmt
        StatusExcel.SUPPLY_BD,
        StatusExcel.SUPPLY_ENGINEERING,
        StatusExcel.SUPPLY_LIFE_SUPPORT,
        StatusExcel.SUPPLY_COMBAT,
        StatusExcel.SUPPLY_GENERAL,
        StatusExcel.MANAGEMENT,
        StatusExcel.KSP,
    ];

    // ✅ ABSENT / NON-COMBAT
    const absentStatuses = [
        // Non-combat
        StatusExcel.NON_COMBAT_ATTACHED_UNITS,
        StatusExcel.NON_COMBAT_TRAINING_NEWCOMERS,
        StatusExcel.NON_COMBAT_NEWCOMERS,
        StatusExcel.NON_COMBAT_HOSPITAL_REFERRAL,
        StatusExcel.NON_COMBAT_EXEMPTED,
        StatusExcel.NON_COMBAT_TREATMENT_ON_SITE,
        StatusExcel.NON_COMBAT_LIMITED_FITNESS,
        StatusExcel.NON_COMBAT_AWAITING_DECISION,
        StatusExcel.NON_COMBAT_REFUSERS,

        // Absent
        StatusExcel.ABSENT_MEDICAL_LEAVE,
        StatusExcel.ABSENT_ANNUAL_LEAVE,
        StatusExcel.ABSENT_FAMILY_LEAVE,
        StatusExcel.ABSENT_TRAINING,
        StatusExcel.ABSENT_BUSINESS_TRIP,
        StatusExcel.ABSENT_ARREST,
        StatusExcel.ABSENT_SZO,
        StatusExcel.ABSENT_HOSPITAL,
        StatusExcel.ABSENT_HOSPITALIZED,
        StatusExcel.ABSENT_MEDICAL_COMPANY,
        StatusExcel.ABSENT_VLK,
        StatusExcel.ABSENT_300,
        StatusExcel.ABSENT_500,
        StatusExcel.ABSENT_200,
        StatusExcel.ABSENT_REHAB_LEAVE,
        StatusExcel.ABSENT_WOUNDED,
        StatusExcel.ABSENT_KIA,
        StatusExcel.ABSENT_MIA,
    ];

    if (inAreaStatuses.some((s) => status.includes(s))) {
        return { statusInArea: status, absenceReason: '' };
    }

    if (absentStatuses.some((s) => status.includes(s))) {
        return { statusInArea: '', absenceReason: status };
    }

    // default → not classified
    return { statusInArea: '', absenceReason: '' };
}
