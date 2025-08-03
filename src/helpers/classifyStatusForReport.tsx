import { StatusExcel } from '../utils/excelUserStatuses';

export default function classifyStatusForReport(status?: string) {
    if (!status) return { statusInArea: '', absenceReason: '' };

    // ✅ IN-AREA (combat / rotation / supply / mgmt)
    const inAreaStatuses = [
        // Combat positions
        StatusExcel.POSITIONS_ON,
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

        // Supply & Mgmt
        StatusExcel.SUPPLY_COMBAT,
        StatusExcel.SUPPLY_GENERAL,
        StatusExcel.MANAGEMENT,
        StatusExcel.NON_COMBAT_NEWCOMERS,
        StatusExcel.NON_COMBAT_LIMITED_FITNESS,
        StatusExcel.NON_COMBAT_LIMITED_FITNESS_IN_COMBAT,
        StatusExcel.NON_COMBAT_REFUSERS,
        StatusExcel.ABSENT_REHABED_ON,
        StatusExcel.HAVE_OFFER_TO_HOS,
    ];

    // ❌ ABSENT / NON-COMBAT
    const absentStatuses = [
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
