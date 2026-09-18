import '../../styles/loader.css';

import { type ReactNode, useEffect, useState } from 'react';

import { useI18nStore } from '../../stores/i18nStore';
import { cn } from './index';

export type LoaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * `brand`   — olive arc + brass counter-arc (pages, cards, overlays)
 * `current` — one colour, inherited from the text (inside buttons, badges, dark rails)
 */
export type LoaderTone = 'brand' | 'current';

const SIZES: Record<LoaderSize, number> = { xs: 14, sm: 18, md: 28, lg: 44, xl: 72 };

/** Below this size the inner arc and the core are unreadable, so they are not drawn. */
const DETAILED_FROM = 24;

type LoaderProps = {
    size?: LoaderSize;
    tone?: LoaderTone;
    /** Accessible name; defaults to "Завантаження…". Pass `null` when a visible text says it. */
    label?: string | null;
    className?: string;
};

/**
 * The application's loading indicator: an arc that grows and shrinks while it turns, a
 * counter-rotating brass arc and a pulsing core ("radar"). Pure SVG + CSS — scales with
 * `size`, follows the theme through tokens, respects reduced motion.
 */
export function Loader({ size = 'md', tone = 'brand', label, className }: LoaderProps) {
    const t = useI18nStore((s) => s.t);
    const px = SIZES[size];
    const detailed = px >= DETAILED_FROM;
    const name = label === undefined ? t('common.loading') : label;
    const brand = tone === 'brand';

    return (
        <svg
            viewBox="0 0 48 48"
            width={px}
            height={px}
            role={name ? 'status' : undefined}
            aria-label={name ?? undefined}
            aria-hidden={name ? undefined : true}
            className={cn('pma-loader', brand ? 'text-primary' : undefined, className)}
        >
            <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.14}
                strokeWidth={detailed ? 3.5 : 5}
            />
            <g className="pma-loader__outer">
                <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={detailed ? 3.5 : 5}
                    strokeLinecap="round"
                />
            </g>
            {detailed && (
                <>
                    <g className={cn('pma-loader__inner', brand && 'text-brass')}>
                        <circle
                            cx="24"
                            cy="24"
                            r="12.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeDasharray="18 61"
                        />
                    </g>
                    <circle
                        className="pma-loader__core"
                        cx="24"
                        cy="24"
                        r="3.5"
                        fill="currentColor"
                    />
                </>
            )}
        </svg>
    );
}

/** Loader + text on one line, for a section or a list that is loading. */
export function InlineLoader({
    children,
    className,
}: {
    children?: ReactNode;
    className?: string;
}) {
    const t = useI18nStore((s) => s.t);
    return (
        <div className={cn('flex items-center gap-2.5 text-sm text-ink-3', className)}>
            <Loader size="sm" label={null} />
            <span role="status">{children ?? t('common.loading')}</span>
        </div>
    );
}

/** True only after `delay` ms: quick loads finish before anything flashes on screen. */
function useDelayedFlag(active: boolean, delay: number): boolean {
    const [visible, setVisible] = useState(delay <= 0 && active);
    useEffect(() => {
        if (!active) {
            setVisible(false);
            return;
        }
        if (delay <= 0) {
            setVisible(true);
            return;
        }
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [active, delay]);
    return visible;
}

type PageLoaderProps = {
    /** Text under the loader; defaults to "Завантаження…". */
    message?: ReactNode;
    /** Delay before it appears (ms). Default 180. */
    delay?: number;
    /** Fill the whole window (boot, sign-in check) instead of the parent area. */
    fullScreen?: boolean;
    /** Mark shown above the loader (the application logo on the start screen). */
    emblem?: ReactNode;
    className?: string;
};

/** Centered loader for a whole page, tab or the application start. */
export function PageLoader({
    message,
    delay = 180,
    fullScreen = false,
    emblem,
    className,
}: PageLoaderProps) {
    const t = useI18nStore((s) => s.t);
    const visible = useDelayedFlag(true, delay);
    return (
        <div
            className={cn(
                'grid place-items-center',
                fullScreen ? 'fixed inset-0 z-40 bg-canvas' : 'min-h-[240px] w-full flex-1',
                className,
            )}
            aria-busy="true"
        >
            {visible && (
                <div className="flex animate-fade-in flex-col items-center gap-4">
                    {emblem}
                    <Loader size={fullScreen ? 'xl' : 'lg'} label={null} />
                    <p role="status" className="text-sm font-medium text-ink-3">
                        {message ?? t('common.loading')}
                    </p>
                </div>
            )}
        </div>
    );
}

type LoadingOverlayProps = {
    active: boolean;
    message?: ReactNode;
    /** Delay before it appears (ms). Default 120. */
    delay?: number;
    children: ReactNode;
    className?: string;
};

/**
 * Keeps the content visible but blocked while it is being saved or reloaded (a card, a modal
 * body, a table). The parent keeps its size, so nothing jumps.
 */
export function LoadingOverlay({
    active,
    message,
    delay = 120,
    children,
    className,
}: LoadingOverlayProps) {
    const visible = useDelayedFlag(active, delay);
    return (
        <div className={cn('relative', className)} aria-busy={active || undefined}>
            <div
                className={cn(active && 'pointer-events-none select-none')}
                inert={active || undefined}
            >
                {children}
            </div>
            {visible && (
                <div className="absolute inset-0 z-10 grid animate-fade-in place-items-center rounded-[inherit] bg-surface/70 backdrop-blur-[1.5px]">
                    <div className="flex flex-col items-center gap-3">
                        <Loader size="lg" />
                        {message && <p className="text-sm font-medium text-ink-2">{message}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

/** Thin indeterminate bar at the top of an area that refreshes in the background. */
export function ProgressBar({ active, className }: { active: boolean; className?: string }) {
    return (
        <div
            className={cn('h-0.5 w-full overflow-hidden', !active && 'invisible', className)}
            aria-hidden="true"
        >
            <div className="pma-progress-bar h-full w-full rounded-full bg-primary" />
        </div>
    );
}

/** Placeholder block with a shimmer, shaped like the content that is coming. */
export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('pma-skeleton rounded-md', className)} aria-hidden="true" />;
}

/** Placeholder lines for a list or a table while the first load runs. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
    return (
        <div className={cn('flex flex-col gap-2.5', className)} aria-hidden="true">
            {Array.from({ length: rows }, (_, index) => (
                <Skeleton key={index} className={cn('h-9', index % 3 === 2 ? 'w-4/5' : 'w-full')} />
            ))}
        </div>
    );
}
