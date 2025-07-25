import { StatusExcel } from './excelUserStatuses';

export type StatusBadgeInfo = {
    icon: string;
    badgeStyle: string;
};

export function getStatusBadge(status?: string): StatusBadgeInfo {
    if (!status || status === StatusExcel.NO_STATUS) {
        return {
            icon: '⚪',
            badgeStyle: 'bg-gray-100 text-gray-600 border-gray-200',
        };
    }

    const s = status.toLowerCase(); // ✅ приводимо до lowercase

    // === АКТИВНІ БОЙОВІ ПОЗИЦІЇ ===
    if (
        s.includes('позиція піхоти') ||
        s.includes('позиція екіпажу') ||
        s.includes('позиція розрахунку') ||
        s.includes('позиція бпла')
    ) {
        return {
            icon: '🪖',
            badgeStyle:
                'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-200 shadow-sm',
        };
    }

    // === РОТАЦІЯ / РЕЗЕРВ ===
    if (
        s.includes('ротація піхота') ||
        s.includes('ротація екіпаж') ||
        s.includes('ротація розрахунок') ||
        s.includes('ротація бпла') ||
        s.includes('ротація') ||
        s.includes('резерв')
    ) {
        return {
            icon: '🔄',
            badgeStyle:
                'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 border-yellow-200 shadow-sm',
        };
    }

    // === ЗАБЕЗПЕЧЕННЯ ===
    if (
        s.includes('забезпечення бд') ||
        s.includes('забезпечення інженерне') ||
        s.includes('забезпечення життєдіяльності')
    ) {
        return {
            icon: '📦',
            badgeStyle:
                'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border-amber-200 shadow-sm',
        };
    }

    // === УПРАВЛІННЯ ===
    if (s.includes('управління') || s.includes('ксп')) {
        return {
            icon: '🏢',
            badgeStyle:
                'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-800 border-indigo-200 shadow-sm',
        };
    }

    // === НЕ БГ / НЕБЕЗПОСЕРЕДНЯ УЧАСТЬ ===
    if (
        s.includes('приданий в інший підрозділ') ||
        s.includes('навчання, новоприбулий') ||
        s.includes('має направлення на лікування') ||
        s.includes('звільнений від фізичного навантаження') ||
        s.includes('лікування на локації') ||
        s.includes('обмежено придатний') ||
        s.includes('очікує кадрового рішення') ||
        s.includes('відмовник')
    ) {
        return {
            icon: '🩺',
            badgeStyle:
                'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-200 shadow-sm',
        };
    }

    // === ВІДСУТНІ / ВІДПУСТКИ ===
    if (
        s.includes('відпустка лікування') ||
        s.includes('відпустка щорічна') ||
        s.includes('відпустка за сімейними') ||
        s.includes('навчання') ||
        s.includes('відрядження')
    ) {
        return {
            icon: '🏖️',
            badgeStyle:
                'bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-800 border-cyan-200 shadow-sm',
        };
    }

    // === АРЕШТ / СЗЧ ===
    if (s.includes('арешт') || s.includes('сзч')) {
        return {
            icon: '⛔',
            badgeStyle:
                'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-200 shadow-sm',
        };
    }

    // === ШПИТАЛЬ / 300 / 500 / 200 ===
    if (
        s.includes('шпиталь') ||
        s.includes('влк') ||
        s.includes('300') ||
        s.includes('500') ||
        s.includes('200')
    ) {
        return {
            icon: '🚑',
            badgeStyle:
                'bg-gradient-to-r from-rose-50 to-rose-100 text-rose-800 border-rose-200 shadow-sm',
        };
    }

    // === ФОЛБЕК ===
    return {
        icon: '⚪',
        badgeStyle: 'bg-gray-100 text-gray-600 border-gray-200',
    };
}
