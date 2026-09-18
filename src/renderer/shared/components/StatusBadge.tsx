import { cn } from '../ui';
import { getStatusBadge } from '../utils/statusBadgeUtils';

/** Soldier status as a coloured chip (colour = status group). */
export function StatusBadge({
    status,
    size = 'sm',
    className,
    emptyLabel = 'Статус не вказано',
}: {
    status?: string | null;
    size?: 'sm' | 'md';
    className?: string;
    emptyLabel?: string;
}) {
    const info = getStatusBadge(status ?? undefined);
    return (
        <span
            title={info.group}
            className={cn(
                'inline-flex max-w-full items-center gap-1.5 rounded-full border font-medium',
                size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-[13px]',
                info.badgeStyle,
                className,
            )}
        >
            {info.icon}
            <span className="truncate">{status || emptyLabel}</span>
        </span>
    );
}

/** Small dot in the status colour, for dense lists. */
export function StatusDot({ status, className }: { status?: string | null; className?: string }) {
    const info = getStatusBadge(status ?? undefined);
    return (
        <span
            title={info.group}
            className={cn(
                'tone-dot inline-block size-2 shrink-0 rounded-full',
                `tone-${info.tone}`,
                className,
            )}
        />
    );
}
