import type { ReactNode } from 'react';

import { cn } from './index';

export type SideNavItem<T extends string> = {
    value: T;
    label: string;
    description?: string;
    icon: ReactNode;
    tone?: 'default' | 'danger';
};

/** Secondary navigation inside a section (backups, administration...). */
export default function SideNav<T extends string>({
    title,
    items,
    value,
    onChange,
}: {
    title: string;
    items: SideNavItem<NoInfer<T>>[];
    value: T;
    onChange: (value: NoInfer<T>) => void;
}) {
    return (
        <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
            <p className="eyebrow px-4 pb-2 pt-4">{title}</p>
            <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
                {items.map((item) => {
                    const active = item.value === value;
                    const danger = item.tone === 'danger';
                    return (
                        <button
                            key={item.value}
                            onClick={() => onChange(item.value)}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                                active
                                    ? danger
                                        ? 'bg-danger-soft'
                                        : 'bg-primary-soft'
                                    : 'hover:bg-surface-2',
                            )}
                        >
                            <span
                                className={cn(
                                    'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4',
                                    active
                                        ? danger
                                            ? 'bg-danger text-on-danger'
                                            : 'bg-primary text-on-primary'
                                        : danger
                                          ? 'bg-danger-soft text-danger-ink'
                                          : 'bg-surface-2 text-ink-3',
                                )}
                            >
                                {item.icon}
                            </span>
                            <span className="min-w-0">
                                <span
                                    className={cn(
                                        'block text-[13px] font-semibold',
                                        active
                                            ? danger
                                                ? 'text-danger-ink'
                                                : 'text-primary-ink'
                                            : 'text-ink',
                                    )}
                                >
                                    {item.label}
                                </span>
                                {item.description && (
                                    <span className="block text-xs leading-snug text-ink-3">
                                        {item.description}
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
