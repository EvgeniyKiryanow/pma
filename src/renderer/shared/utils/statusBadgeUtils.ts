import {
    Ban,
    Building2,
    CircleDashed,
    Crosshair,
    HeartPulse,
    type LucideIcon,
    Luggage,
    Package,
    RefreshCw,
} from 'lucide-react';
import { createElement, type ReactNode } from 'react';

import { StatusExcel } from './excelUserStatuses';

/** Hue families defined in styles/index.css (`.tone-*`), readable in both themes. */
export type Tone =
    | 'olive'
    | 'amber'
    | 'sand'
    | 'steel'
    | 'violet'
    | 'teal'
    | 'sky'
    | 'red'
    | 'rose'
    | 'gray';

export type StatusBadgeInfo = {
    icon: ReactNode;
    /** Classes for a chip: background, text and border colour of the tone. */
    badgeStyle: string;
    tone: Tone;
    /** Short name of the status group, for legends and tooltips. */
    group: string;
};

const badge = (tone: Tone, Icon: LucideIcon, group: string): StatusBadgeInfo => ({
    icon: createElement(Icon, { className: 'size-3.5 shrink-0', 'aria-hidden': true }),
    badgeStyle: `tone tone-${tone}`,
    tone,
    group,
});

export function getStatusBadge(status?: string): StatusBadgeInfo {
    if (!status || status === StatusExcel.NO_STATUS) {
        return badge('gray', CircleDashed, 'Без статусу');
    }

    const s = status.toLowerCase();

    // Active combat positions
    if (
        s.includes('позиція піхоти') ||
        s.includes('позиція екіпажу') ||
        s.includes('позиція розрахунку') ||
        s.includes('позиція бпла')
    ) {
        return badge('olive', Crosshair, 'На позиціях');
    }

    // Rotation / reserve
    if (
        s.includes('ротація піхота') ||
        s.includes('ротація екіпаж') ||
        s.includes('ротація розрахунок') ||
        s.includes('ротація бпла') ||
        s.includes('ротація') ||
        s.includes('резерв')
    ) {
        return badge('amber', RefreshCw, 'Ротація / резерв');
    }

    // Support
    if (
        s.includes('забезпечення бд') ||
        s.includes('забезпечення інженерне') ||
        s.includes('забезпечення життєдіяльності')
    ) {
        return badge('sand', Package, 'Забезпечення');
    }

    // Command
    if (s.includes('управління') || s.includes('ксп')) {
        return badge('steel', Building2, 'Управління');
    }

    // Not directly in combat
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
        return badge('sky', CircleDashed, 'Не бере участі в БД');
    }

    // Absent: leave, training, business trip
    if (
        s.includes('відпустка лікування') ||
        s.includes('відпустка щорічна') ||
        s.includes('відпустка за сімейними') ||
        s.includes('навчання') ||
        s.includes('відрядження')
    ) {
        return badge('teal', Luggage, 'Відпустка / відрядження');
    }

    // Arrest / AWOL
    if (s.includes('арешт') || s.includes('сзч')) {
        return badge('red', Ban, 'Арешт / СЗЧ');
    }

    // Hospital / 300 / 500 / 200
    if (
        s.includes('шпиталь') ||
        s.includes('влк') ||
        s.includes('300') ||
        s.includes('500') ||
        s.includes('200')
    ) {
        return badge('rose', HeartPulse, 'Лікування / втрати');
    }

    return badge('gray', CircleDashed, 'Інше');
}
