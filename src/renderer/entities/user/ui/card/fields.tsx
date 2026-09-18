import { CalendarDays } from 'lucide-react';
import { useId, useRef } from 'react';

import type { CardField } from '../../../../../shared/personnel/cardSchema';
import { parseDate } from '../../../../../shared/personnel/recognize';
import { cn } from '../../../../shared/ui';
import { StatusExcel } from '../../../../shared/utils/excelUserStatuses';
import { useI18nStore } from '../../../../stores/i18nStore';

type Value = string | boolean | number | null | undefined;

/** "2026-09-18" (the calendar) → "18.09.2026" (how dates are written in the cards). */
function isoToDotted(iso: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : iso;
}

function dottedToIso(value: string): string {
    const date = parseDate(value);
    return date ? date.toISOString().slice(0, 10) : '';
}

/** A date typed as ДД.ММ.РРРР, or picked in the calendar. */
export function DateInput({
    id,
    value,
    onChange,
    className,
}: {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    className?: string;
}) {
    const { t } = useI18nStore();
    const picker = useRef<HTMLInputElement>(null);
    const invalid = value.trim() !== '' && !parseDate(value);
    return (
        <div className={cn('relative', className)}>
            <input
                id={id}
                className="field pr-10 tabular-nums"
                value={value}
                placeholder={t('card.datePlaceholder')}
                aria-invalid={invalid}
                onChange={(e) => onChange(e.target.value)}
            />
            <button
                type="button"
                tabIndex={-1}
                aria-label={t('card.pickDate')}
                title={t('card.pickDate')}
                onClick={() => {
                    const input = picker.current;
                    if (!input) return;
                    input.value = dottedToIso(value);
                    try {
                        input.showPicker();
                    } catch {
                        input.focus();
                    }
                }}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-3 transition-colors hover:text-primary-ink"
            >
                <CalendarDays className="size-4" />
            </button>
            <input
                ref={picker}
                type="date"
                tabIndex={-1}
                aria-hidden
                className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
                onChange={(e) => e.target.value && onChange(isoToDotted(e.target.value))}
            />
            {invalid && <p className="mt-1 text-xs text-warning-ink">{t('card.dateInvalid')}</p>}
        </div>
    );
}

/**
 * One value of a dictionary. A value outside it (typed in Excel or an older version) stays
 * selected and is marked «як записано», so opening and saving the card never loses it.
 */
export function DictionarySelect({
    id,
    value,
    options,
    onChange,
}: {
    id?: string;
    value: string;
    options: readonly string[];
    onChange: (value: string) => void;
}) {
    const { t } = useI18nStore();
    const outside = value !== '' && !options.includes(value);
    return (
        <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{t('card.choose')}</option>
            {outside && <option value={value}>{t('card.asWritten', { value })}</option>}
            {options.map((option) => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
        </select>
    );
}

/** Several values of a dictionary, stored as «B,C1» (Impulse «+» columns). */
export function MultiChoice({
    value,
    options,
    onChange,
}: {
    value: string;
    options: readonly string[];
    onChange: (value: string) => void;
}) {
    const chosen = value
        .toUpperCase()
        .split(/[\s,;]+/)
        .filter(Boolean);
    const unknown = chosen.filter((item) => !options.includes(item));
    const toggle = (option: string) => {
        const next = chosen.includes(option)
            ? chosen.filter((item) => item !== option)
            : [...chosen, option];
        onChange(
            options
                .filter((o) => next.includes(o))
                .concat(unknown)
                .join(','),
        );
    };
    return (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-line bg-surface p-1.5">
            {options.map((option) => {
                const on = chosen.includes(option);
                return (
                    <button
                        key={option}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(option)}
                        className={cn(
                            'h-7 min-w-9 rounded-md px-2 font-mono text-xs font-semibold transition-colors',
                            on
                                ? 'bg-primary text-on-primary shadow-card'
                                : 'bg-surface-2 text-ink-3 hover:bg-surface-3 hover:text-ink',
                        )}
                    >
                        {option}
                    </button>
                );
            })}
            {unknown.map((item) => (
                <span
                    key={item}
                    className="h-7 rounded-md bg-warning-soft px-2 text-xs leading-7 text-warning-ink"
                >
                    {item}
                </span>
            ))}
        </div>
    );
}

/** Label + the control of a card field, by its kind. */
export function CardFieldInput({
    field,
    value,
    onChange,
}: {
    field: CardField;
    value: Value;
    onChange: (value: Value) => void;
}) {
    const { t } = useI18nStore();
    const id = useId();
    const listId = `${id}-list`;
    const label = t(`card.fields.${field.key}`);
    const text = value === null || value === undefined ? '' : String(value);

    if (field.kind === 'checkbox') {
        return (
            <label
                className={cn(
                    'flex items-center gap-2.5 self-end rounded-lg border border-line px-3 py-2.5 text-sm text-ink',
                    field.wide && 'col-span-full',
                )}
            >
                <input
                    type="checkbox"
                    className="size-4"
                    checked={Boolean(value) && value !== '0'}
                    onChange={(e) => onChange(e.target.checked)}
                />
                {label}
            </label>
        );
    }

    let control;
    switch (field.kind) {
        case 'date':
            control = <DateInput id={id} value={text} onChange={onChange} />;
            break;
        case 'select':
            control = (
                <DictionarySelect
                    id={id}
                    value={text}
                    options={field.options ?? []}
                    onChange={onChange}
                />
            );
            break;
        case 'status':
            control = (
                <DictionarySelect
                    id={id}
                    value={text}
                    options={Object.values(StatusExcel)}
                    onChange={onChange}
                />
            );
            break;
        case 'gender':
            control = (
                <select
                    id={id}
                    className="field"
                    value={text}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="">{t('card.choose')}</option>
                    <option value="male">{t('card.genders.male')}</option>
                    <option value="female">{t('card.genders.female')}</option>
                    {text && text !== 'male' && text !== 'female' && (
                        <option value={text}>{t('card.asWritten', { value: text })}</option>
                    )}
                </select>
            );
            break;
        case 'multi':
            control = (
                <MultiChoice value={text} options={field.options ?? []} onChange={onChange} />
            );
            break;
        case 'combo':
            control = (
                <>
                    <input
                        id={id}
                        className="field"
                        list={listId}
                        value={text}
                        autoComplete="off"
                        onChange={(e) => onChange(e.target.value)}
                    />
                    <datalist id={listId}>
                        {(field.options ?? []).map((option) => (
                            <option key={option} value={option} />
                        ))}
                    </datalist>
                </>
            );
            break;
        case 'textarea':
            control = (
                <textarea
                    id={id}
                    className="field"
                    rows={field.legacy ? 2 : 3}
                    value={text}
                    onChange={(e) => onChange(e.target.value)}
                />
            );
            break;
        default:
            control = (
                <input
                    id={id}
                    className="field"
                    value={text}
                    onChange={(e) => onChange(e.target.value)}
                />
            );
    }

    return (
        <div className={cn('min-w-0', (field.wide || field.kind === 'multi') && 'col-span-full')}>
            <label htmlFor={id} className="label">
                {label}
            </label>
            {control}
        </div>
    );
}
