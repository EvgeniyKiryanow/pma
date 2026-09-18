import {
    Building2,
    ChevronsUp,
    Crosshair,
    FileText,
    Flag,
    type LucideIcon,
    Medal,
    Package,
    Star,
    Tag,
    UserRound,
    Wrench,
} from 'lucide-react';
import { createElement, type ReactNode } from 'react';

import type { Tone } from './statusBadgeUtils';

export type PosadaBadgeInfo = {
    icon: ReactNode;
    /** Tone classes (background, text, border) — see `.tone-*` in styles/index.css. */
    badgeStyle: string;
    tone: Tone;
};

const badge = (tone: Tone, Icon: LucideIcon): PosadaBadgeInfo => ({
    icon: createElement(Icon, { className: 'size-3 shrink-0', 'aria-hidden': true }),
    badgeStyle: `tone tone-${tone}`,
    tone,
});

/** Підрозділ (unit_name) */
export function getUnitBadge(unitName?: string | null): PosadaBadgeInfo {
    const u = (unitName ?? '').toLowerCase();
    if (u.includes('рота') || u.includes('батальйон')) return badge('olive', Flag);
    if (u.includes('штаб') || u.includes('управління')) return badge('steel', Building2);
    if (u.includes('забезпечення') || u.includes('логістика')) return badge('sand', Package);
    return badge('gray', Flag);
}

/** Посада (position_name) */
export function getPositionBadge(positionName?: string | null): PosadaBadgeInfo {
    const p = (positionName ?? '').toLowerCase();
    if (p.includes('командир') || p.includes('заступник')) return badge('violet', Star);
    if (p.includes('сержант') || p.includes('технік') || p.includes('медик'))
        return badge('olive', Wrench);
    if (p.includes('стрілець') || p.includes('водій') || p.includes('оператор'))
        return badge('gray', Crosshair);
    return badge('gray', UserRound);
}

/** Категорія (кат) */
export function getCategoryBadge(category?: string | null): PosadaBadgeInfo {
    const c = (category ?? '').toLowerCase();
    if (c.includes('оф') || c.includes('офіцер')) return badge('violet', Medal);
    if (c.includes('серж') || c.includes('старшина')) return badge('olive', ChevronsUp);
    if (c.includes('солд') || c.includes('рядовий')) return badge('gray', UserRound);
    return badge('gray', Tag);
}

/** ШПК (military specialization) */
export function getShpkBadge(shpk?: string | null): PosadaBadgeInfo {
    const s = (shpk ?? '').toLowerCase();
    if (s.startsWith('1') || s.startsWith('2')) return badge('rose', FileText);
    if (s.startsWith('3') || s.startsWith('4')) return badge('teal', FileText);
    return badge('gray', FileText);
}
