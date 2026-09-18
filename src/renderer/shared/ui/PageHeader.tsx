import type { ReactNode } from 'react';

import { cn } from './index';

/**
 * Top bar of a section: either sub-navigation tabs, or a title with a short description,
 * plus actions on the right. Stays compact so the workspace keeps most of the height.
 */
export default function PageHeader({
    title,
    description,
    icon,
    tabs,
    actions,
    className,
}: {
    title?: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    tabs?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-surface px-5',
                tabs ? 'min-h-12' : 'py-3.5',
                className,
            )}
        >
            {tabs ? (
                <div className="-mb-px min-w-0 max-w-full">{tabs}</div>
            ) : (
                <div className="flex min-w-0 items-center gap-3">
                    {icon && (
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink [&_svg]:size-[18px]">
                            {icon}
                        </span>
                    )}
                    <div className="min-w-0">
                        {title && (
                            <h1 className="truncate text-[17px] font-semibold leading-tight text-ink">
                                {title}
                            </h1>
                        )}
                        {description && (
                            <p className="mt-0.5 truncate text-[13px] text-ink-3">{description}</p>
                        )}
                    </div>
                </div>
            )}
            {actions && (
                <div className={cn('flex flex-wrap items-center gap-2', tabs && 'py-2')}>
                    {actions}
                </div>
            )}
        </div>
    );
}
