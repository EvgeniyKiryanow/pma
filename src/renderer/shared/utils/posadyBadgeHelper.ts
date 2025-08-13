export type PosadaBadgeInfo = {
    icon: string;
    badgeStyle: string;
};

/**
 * Returns badge style for Підрозділ (unit_name)
 */
export function getUnitBadge(unitName?: string): PosadaBadgeInfo {
    if (!unitName) {
        return {
            icon: '🏳️',
            badgeStyle: 'bg-gray-100 text-gray-600 border-gray-200',
        };
    }

    const u = unitName.toLowerCase();

    if (u.includes('рота') || u.includes('батальйон')) {
        return {
            icon: '🪖',
            badgeStyle:
                'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-200 shadow-sm',
        };
    }

    if (u.includes('штаб') || u.includes('управління')) {
        return {
            icon: '🏢',
            badgeStyle:
                'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-800 border-indigo-200 shadow-sm',
        };
    }

    if (u.includes('забезпечення') || u.includes('логістика')) {
        return {
            icon: '📦',
            badgeStyle:
                'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border-amber-200 shadow-sm',
        };
    }

    return {
        icon: '🏳️',
        badgeStyle: 'bg-gray-100 text-gray-600 border-gray-200',
    };
}

/**
 * Returns badge style for Посада (position_name)
 */
export function getPositionBadge(positionName?: string): PosadaBadgeInfo {
    if (!positionName) {
        return {
            icon: '👤',
            badgeStyle: 'bg-gray-100 text-gray-600 border-gray-200',
        };
    }

    const p = positionName.toLowerCase();

    if (p.includes('командир') || p.includes('заступник')) {
        return {
            icon: '⭐',
            badgeStyle:
                'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-200 shadow-sm',
        };
    }

    if (p.includes('сержант') || p.includes('технік') || p.includes('медик')) {
        return {
            icon: '🪖',
            badgeStyle:
                'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-200 shadow-sm',
        };
    }

    if (p.includes('стрілець') || p.includes('водій') || p.includes('оператор')) {
        return {
            icon: '🔫',
            badgeStyle:
                'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-gray-200 shadow-sm',
        };
    }

    return {
        icon: '👤',
        badgeStyle: 'bg-gray-100 text-gray-600 border-gray-200',
    };
}

/**
 * Returns badge style for Категорія (кат)
 */
export function getCategoryBadge(category?: string): PosadaBadgeInfo {
    if (!category) {
        return {
            icon: '🏷️',
            badgeStyle: 'bg-gray-100 text-gray-600 border-gray-200',
        };
    }

    const c = category.toLowerCase();

    // === ОФІЦЕР ===
    if (c.includes('оф') || c.includes('офіцер')) {
        return {
            icon: '🎖️',
            badgeStyle:
                'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-200 shadow-sm',
        };
    }

    // === СЕРЖАНТ ===
    if (c.includes('серж') || c.includes('старшина')) {
        return {
            icon: '🪖',
            badgeStyle:
                'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-200 shadow-sm',
        };
    }

    // === СОЛДАТ ===
    if (c.includes('солд') || c.includes('рядовий')) {
        return {
            icon: '👤',
            badgeStyle:
                'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-gray-200 shadow-sm',
        };
    }

    // fallback
    return {
        icon: '🏷️',
        badgeStyle: 'bg-gray-100 text-gray-600 border-gray-200',
    };
}

/**
 * Returns badge style for ШПК (military specialization)
 */
export function getShpkBadge(shpk?: string): PosadaBadgeInfo {
    if (!shpk) {
        return {
            icon: '📄',
            badgeStyle: 'bg-gray-100 text-gray-600 border-gray-200',
        };
    }

    const s = shpk.toLowerCase();

    if (s.startsWith('1') || s.startsWith('2')) {
        return {
            icon: '🎯',
            badgeStyle:
                'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-200 shadow-sm',
        };
    }

    if (s.startsWith('3') || s.startsWith('4')) {
        return {
            icon: '⚙️',
            badgeStyle:
                'bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-800 border-cyan-200 shadow-sm',
        };
    }

    return {
        icon: '📄',
        badgeStyle: 'bg-gray-100 text-gray-600 border-gray-200',
    };
}
