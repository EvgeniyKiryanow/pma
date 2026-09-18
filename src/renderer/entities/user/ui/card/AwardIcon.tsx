import { useId } from 'react';

import { type AwardGroupId, type AwardKind, findAward } from '../../../../../shared/awards/catalog';
import { cn } from '../../../../shared/ui';

/**
 * A small drawn insignia for an award: the shape tells the kind (order, cross, medal, badge…),
 * the colour the body that awards it, the metal the degree. Stylised — not the real ribbon.
 */

type Palette = { ribbon: [string, string]; accent: string };

const PALETTES: Record<AwardGroupId, Palette> = {
    // blue and yellow ribbon: awards of the state and of the President
    state: { ribbon: ['#1F5FBF', '#F2C230'], accent: '#1F5FBF' },
    president: { ribbon: ['#2B6FD6', '#F2C230'], accent: '#2B6FD6' },
    // field green of the Armed Forces
    mod: { ribbon: ['#4E6B2A', '#C9B458'], accent: '#4E6B2A' },
    // black and red of the honorary badges of the Commander-in-Chief
    commander: { ribbon: ['#1E2328', '#B3322B'], accent: '#B3322B' },
    titles: { ribbon: ['#6B4AA8', '#E7D7A0'], accent: '#6B4AA8' },
    other: { ribbon: ['#6B7280', '#C8CDD4'], accent: '#6B7280' },
};

type Metal = [string, string, string];

const GOLD: Metal = ['#FBE7A1', '#E0B24E', '#A87424'];
const SILVER: Metal = ['#F4F6F8', '#BCC4CC', '#7E8893'];
const BRONZE: Metal = ['#F3C9A0', '#C27F4A', '#8A5327'];
const STEEL: Metal = ['#DCE2E8', '#8C97A3', '#56606B'];

/** I — gold, II — silver, III — bronze, IV–V — steel; awards without degrees are gold. */
function metalOf(degree?: string, kind?: AwardKind): Metal {
    if (degree === 'II') return SILVER;
    if (degree === 'III') return BRONZE;
    if (degree === 'IV' || degree === 'V') return STEEL;
    if (!degree && (kind === 'badge' || kind === 'weapon')) return SILVER;
    return GOLD;
}

export default function AwardIcon({
    awardId,
    degree,
    size = 36,
    className,
    muted,
}: {
    awardId: string;
    degree?: string;
    size?: number;
    className?: string;
    /** Not granted yet (submitted, rejected): drawn pale. */
    muted?: boolean;
}) {
    const uid = useId().replace(/:/g, '');
    const award = findAward(awardId) ?? findAward('other')!;
    const palette = PALETTES[award.group];
    const metal = metalOf(degree, award.kind);
    const metalId = `aw-metal-${uid}`;
    const shineId = `aw-shine-${uid}`;
    const withRibbon = !['letter', 'title', 'weapon', 'badge'].includes(award.kind);

    return (
        <svg
            viewBox="0 0 40 40"
            width={size}
            height={size}
            className={cn('shrink-0', muted && 'opacity-45 grayscale-60', className)}
            aria-hidden
        >
            <defs>
                <linearGradient id={metalId} x1="0.15" y1="0" x2="0.85" y2="1">
                    <stop offset="0" stopColor={metal[0]} />
                    <stop offset="0.55" stopColor={metal[1]} />
                    <stop offset="1" stopColor={metal[2]} />
                </linearGradient>
                <radialGradient id={shineId} cx="0.35" cy="0.3" r="0.7">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
            </defs>

            {withRibbon && (
                <g>
                    <path d="M13 1h14l-2 12h-10z" fill={palette.ribbon[0]} />
                    <path d="M18 1h4l-.8 12h-2.4z" fill={palette.ribbon[1]} />
                </g>
            )}

            <Shape kind={award.kind} fill={`url(#${metalId})`} accent={palette.accent} />
            {award.kind !== 'letter' && award.kind !== 'weapon' && (
                <circle cx="20" cy="25" r="14" fill={`url(#${shineId})`} opacity="0.5" />
            )}
        </svg>
    );
}

function Shape({ kind, fill, accent }: { kind: AwardKind; fill: string; accent: string }) {
    const stroke = 'rgba(40,30,10,0.45)';
    switch (kind) {
        case 'hero':
            return (
                <path
                    d="M20 11.5l3.3 8.1 8.7.6-6.7 5.6 2.1 8.5L20 29.6l-7.4 4.7 2.1-8.5-6.7-5.6 8.7-.6z"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                />
            );
        case 'order':
            return (
                <g>
                    <path
                        d="M20 10l2.6 6.3 6.8-2.1-2.1 6.8L33.6 23.6l-6.3 2.6 2.1 6.8-6.8-2.1L20 37.2l-2.6-6.3-6.8 2.1 2.1-6.8-6.3-2.6 6.3-2.6-2.1-6.8 6.8 2.1z"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth="0.7"
                        strokeLinejoin="round"
                    />
                    <circle
                        cx="20"
                        cy="23.6"
                        r="4.6"
                        fill={accent}
                        stroke={stroke}
                        strokeWidth="0.6"
                    />
                    <path
                        d="M20 20.6l.9 2.1 2.2.2-1.7 1.4.5 2.2-1.9-1.2-1.9 1.2.5-2.2-1.7-1.4 2.2-.2z"
                        fill="#FBE7A1"
                    />
                </g>
            );
        case 'cross':
            return (
                <g>
                    <path
                        d="M17.8 21.2 16 12.6h8l-1.8 8.6 8.6-1.6v7.6l-8.6-1.6 1.8 8.6h-8l1.8-8.6-8.6 1.6v-7.6z"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth="0.7"
                        strokeLinejoin="round"
                    />
                    <circle
                        cx="20"
                        cy="23.4"
                        r="3.2"
                        fill={accent}
                        stroke={stroke}
                        strokeWidth="0.5"
                    />
                </g>
            );
        case 'medal':
            return (
                <g>
                    <circle
                        cx="20"
                        cy="25"
                        r="10.6"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth="0.8"
                    />
                    <circle
                        cx="20"
                        cy="25"
                        r="7.6"
                        fill="none"
                        stroke={stroke}
                        strokeWidth="0.6"
                        opacity="0.7"
                    />
                    <path
                        d="M20 20.2l1.4 3.1 3.3.3-2.5 2.2.8 3.3-3-1.8-3 1.8.8-3.3-2.5-2.2 3.3-.3z"
                        fill={accent}
                        opacity="0.85"
                    />
                </g>
            );
        case 'badge':
            return (
                <g>
                    <path
                        d="M20 6.5l12 4.4v11.3c0 7.6-5.1 12.7-12 15.3-6.9-2.6-12-7.7-12-15.3V10.9z"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth="0.8"
                    />
                    <path
                        d="M20 10.4l8.4 3.1v8.4c0 5.3-3.5 9-8.4 11-4.9-2-8.4-5.7-8.4-11v-8.4z"
                        fill={accent}
                        opacity="0.9"
                    />
                    <path
                        d="M20 15.6l1.5 3.3 3.6.3-2.7 2.4.8 3.5-3.2-1.9-3.2 1.9.8-3.5-2.7-2.4 3.6-.3z"
                        fill="#FBE7A1"
                    />
                </g>
            );
        case 'weapon':
            return (
                <g transform="rotate(-35 20 20)">
                    <path
                        d="M18.6 4h2.8l.9 22h-4.6z"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth="0.7"
                    />
                    <path d="M13 26h14v2.8H13z" fill={accent} />
                    <path d="M18.4 28.8h3.2v7h-3.2z" fill="#6B4A2B" />
                    <circle cx="20" cy="36.6" r="1.8" fill={fill} />
                </g>
            );
        case 'letter':
            return (
                <g>
                    <path d="M9 6h17l5 5v23H9z" fill="#FBF6E8" stroke={stroke} strokeWidth="0.8" />
                    <path d="M26 6v5h5" fill="none" stroke={stroke} strokeWidth="0.8" />
                    <path d="M13 14h13M13 18h14M13 22h10" stroke="#9A8C6A" strokeWidth="1.2" />
                    <circle cx="25" cy="29" r="4.4" fill={accent} />
                    <path d="M22.6 32.4l-1.4 4 3.8-1.6 3.8 1.6-1.4-4" fill={accent} />
                </g>
            );
        case 'title':
            return (
                <g fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round">
                    <path d="M13 31c-4-3.5-5-9-2.5-14" />
                    <path d="M27 31c4-3.5 5-9 2.5-14" />
                    <path
                        d="M11 22l3 1M10.6 18l3 1.6M12.4 26.5l3-.2M29 22l-3 1M29.4 18l-3 1.6M27.6 26.5l-3-.2"
                        strokeWidth="1.6"
                    />
                    <path
                        d="M20 12.5l2.1 4.5 4.9.5-3.7 3.3 1.1 4.8L20 23.1l-4.4 2.5 1.1-4.8-3.7-3.3 4.9-.5z"
                        fill={fill}
                        stroke="rgba(40,30,10,0.45)"
                        strokeWidth="0.7"
                    />
                </g>
            );
        default:
            return (
                <g>
                    <circle cx="20" cy="25" r="10" fill={fill} stroke={stroke} strokeWidth="0.8" />
                    <circle cx="20" cy="25" r="4" fill={accent} />
                </g>
            );
    }
}
