import { Check, ChevronDown, Search, X } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useI18nStore } from '../../stores/i18nStore';
import { cn } from './index';

export type MultiSelectOption = { value: string; label: string; count?: number };

/**
 * A filter over one column: a button that says what is chosen, and a list with a search box,
 * check marks and how many rows each choice has. Nothing chosen means «all».
 */
export function MultiSelect({
    label,
    icon,
    options,
    selected,
    onChange,
    className,
}: {
    label: string;
    icon?: ReactNode;
    options: MultiSelectOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    className?: string;
}) {
    const { t } = useI18nStore();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const root = useRef<HTMLDivElement>(null);
    const search = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        const outside = (event: MouseEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', outside);
        document.addEventListener('keydown', escape);
        search.current?.focus();
        return () => {
            document.removeEventListener('mousedown', outside);
            document.removeEventListener('keydown', escape);
        };
    }, [open]);

    const shown = useMemo(() => {
        const words = query.toLowerCase().trim();
        return words ? options.filter((o) => o.label.toLowerCase().includes(words)) : options;
    }, [options, query]);

    const chosen = new Set(selected);
    const toggle = (value: string) =>
        onChange(chosen.has(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    const summary =
        selected.length === 0
            ? null
            : selected.length === 1
              ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
              : t('multiSelect.chosen', { count: selected.length });

    return (
        <div ref={root} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className={cn(
                    'flex h-9 max-w-[260px] items-center gap-2 rounded-lg border px-3 text-[13px] transition-colors',
                    selected.length
                        ? 'border-primary bg-primary-soft text-primary-ink'
                        : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-2',
                )}
            >
                {icon && <span className="shrink-0 [&_svg]:size-4">{icon}</span>}
                <span className="shrink-0 font-medium">{label}</span>
                {summary && <span className="min-w-0 truncate">: {summary}</span>}
                <ChevronDown
                    className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
                />
            </button>
            {selected.length > 0 && (
                <button
                    type="button"
                    aria-label={t('multiSelect.clear')}
                    title={t('multiSelect.clear')}
                    onClick={() => onChange([])}
                    className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-primary text-on-primary"
                >
                    <X className="size-3" />
                </button>
            )}

            {open && (
                <div className="absolute left-0 top-full z-40 mt-1.5 w-72 animate-pop-in overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
                    {options.length > 7 && (
                        <div className="relative border-b border-line p-2">
                            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
                            <input
                                ref={search}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t('multiSelect.search')}
                                className="field h-8 pl-8 text-[13px]"
                            />
                        </div>
                    )}
                    <ul
                        className="max-h-72 overflow-y-auto p-1"
                        role="listbox"
                        aria-multiselectable
                    >
                        {shown.length === 0 && (
                            <li className="px-3 py-2 text-[13px] text-ink-3">
                                {t('multiSelect.nothing')}
                            </li>
                        )}
                        {shown.map((option) => {
                            const on = chosen.has(option.value);
                            return (
                                <li key={option.value}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={on}
                                        onClick={() => toggle(option.value)}
                                        className={cn(
                                            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-2',
                                            option.count === 0 && !on && 'opacity-50',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'grid size-4 shrink-0 place-items-center rounded border',
                                                on
                                                    ? 'border-primary bg-primary text-on-primary'
                                                    : 'border-line-strong',
                                            )}
                                        >
                                            {on && <Check className="size-3" />}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-ink">
                                            {option.label}
                                        </span>
                                        {option.count !== undefined && (
                                            <span className="font-mono text-[11px] tabular-nums text-ink-3">
                                                {option.count}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-2 px-2 py-1.5">
                        <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs font-medium text-primary-ink hover:bg-surface-3"
                            onClick={() =>
                                onChange([...new Set([...selected, ...shown.map((o) => o.value)])])
                            }
                        >
                            {t('multiSelect.all')}
                        </button>
                        <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs font-medium text-ink-2 hover:bg-surface-3"
                            onClick={() => onChange([])}
                        >
                            {t('multiSelect.clear')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
