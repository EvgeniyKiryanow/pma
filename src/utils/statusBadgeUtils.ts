import { StatusExcel } from './excelUserStatuses';

export type StatusBadgeInfo = {
    icon: string;
    badgeStyle: string;
};

// ✅ Full badge map
export function getStatusBadge(status?: string): StatusBadgeInfo {
    if (!status || status === StatusExcel.NO_STATUS) {
        return {
            icon: '⚪',
            badgeStyle: 'bg-gray-100 text-gray-600 border-gray-200',
        };
    }

    const s = status.toUpperCase();

    // === ACTIVE COMBAT POSITIONS ===
    if (
        s.includes(StatusExcel.POSITIONS_INFANTRY) ||
        s.includes(StatusExcel.POSITIONS_CREW) ||
        s.includes(StatusExcel.POSITIONS_CALCULATION) ||
        s.includes(StatusExcel.POSITIONS_UAV)
    ) {
        return {
            icon: '🪖',
            badgeStyle:
                'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-200 shadow-sm',
        };
    }

    // === ROTATION / RESERVE ===
    if (
        s.includes(StatusExcel.ROTATION_INFANTRY) ||
        s.includes(StatusExcel.ROTATION_CREW) ||
        s.includes(StatusExcel.ROTATION_CALCULATION) ||
        s.includes(StatusExcel.ROTATION_UAV) ||
        s.includes('РОТАЦІЯ') ||
        s.includes('РЕЗЕРВ')
    ) {
        return {
            icon: '🔄',
            badgeStyle:
                'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 border-yellow-200 shadow-sm',
        };
    }

    // === SUPPLY / LOGISTICS ===
    if (
        s.includes(StatusExcel.SUPPLY_BD) ||
        s.includes(StatusExcel.SUPPLY_ENGINEERING) ||
        s.includes(StatusExcel.SUPPLY_LIFE_SUPPORT)
    ) {
        return {
            icon: '📦',
            badgeStyle:
                'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border-amber-200 shadow-sm',
        };
    }

    // === COMMAND / MANAGEMENT ===
    if (
        s.includes(StatusExcel.MANAGEMENT) ||
        s.includes(StatusExcel.KSP) ||
        s.includes('УПРАВЛІННЯ')
    ) {
        return {
            icon: '🏢',
            badgeStyle:
                'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-800 border-indigo-200 shadow-sm',
        };
    }

    // === NON-COMBAT (Training, Attached units, etc.) ===
    if (
        s.includes(StatusExcel.NON_COMBAT_ATTACHED_UNITS) ||
        s.includes(StatusExcel.NON_COMBAT_TRAINING_NEWCOMERS) ||
        s.includes(StatusExcel.NON_COMBAT_HOSPITAL_REFERRAL) ||
        s.includes(StatusExcel.NON_COMBAT_EXEMPTED) ||
        s.includes(StatusExcel.NON_COMBAT_TREATMENT_ON_SITE) ||
        s.includes(StatusExcel.NON_COMBAT_LIMITED_FITNESS) ||
        s.includes(StatusExcel.NON_COMBAT_AWAITING_DECISION) ||
        s.includes(StatusExcel.NON_COMBAT_REFUSERS)
    ) {
        return {
            icon: '🩺',
            badgeStyle:
                'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-200 shadow-sm',
        };
    }

    // === ABSENT / LEAVE ===
    if (
        s.includes(StatusExcel.ABSENT_MEDICAL_LEAVE) ||
        s.includes(StatusExcel.ABSENT_ANNUAL_LEAVE) ||
        s.includes(StatusExcel.ABSENT_FAMILY_LEAVE) ||
        s.includes(StatusExcel.ABSENT_TRAINING) ||
        s.includes(StatusExcel.ABSENT_BUSINESS_TRIP)
    ) {
        return {
            icon: '🏖️',
            badgeStyle:
                'bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-800 border-cyan-200 shadow-sm',
        };
    }

    // === ARREST / SZO ===
    if (s.includes(StatusExcel.ABSENT_ARREST) || s.includes(StatusExcel.ABSENT_SZO)) {
        return {
            icon: '⛔',
            badgeStyle:
                'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-200 shadow-sm',
        };
    }

    // === HOSPITAL / MED EVAC (300/500/200) ===
    if (
        s.includes(StatusExcel.ABSENT_HOSPITAL) ||
        s.includes(StatusExcel.ABSENT_VLK) ||
        s.includes(StatusExcel.ABSENT_300) ||
        s.includes(StatusExcel.ABSENT_500) ||
        s.includes(StatusExcel.ABSENT_200)
    ) {
        return {
            icon: '🚑',
            badgeStyle:
                'bg-gradient-to-r from-rose-50 to-rose-100 text-rose-800 border-rose-200 shadow-sm',
        };
    }

    // === DEFAULT FALLBACK ===
    return {
        icon: '⚪',
        badgeStyle: 'bg-gray-100 text-gray-600 border-gray-200',
    };
}
