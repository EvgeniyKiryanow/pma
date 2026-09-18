import { AlertTriangle, CheckCircle2, Eye, EyeOff, Info, Search, X, XCircle } from 'lucide-react';
import {
    type ButtonHTMLAttributes,
    type InputHTMLAttributes,
    type MouseEvent,
    type ReactNode,
    type TextareaHTMLAttributes,
    useEffect,
    useId,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

import { Loader } from './loader';

/**
 * UI primitives of the design system. Colours come from the theme tokens in
 * styles/index.css (bg-surface, text-ink, bg-primary...), so every component works in the
 * day and night themes. Avoid raw palette classes such as `bg-white` in new code.
 */

export function cn(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}

// ------------------------------------------------------------------ Button

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'danger'
    | 'soft'
    | 'danger-soft'
    | 'rail';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-on-primary shadow-card hover:bg-primary-hover',
    secondary: 'border border-line-strong bg-surface text-ink shadow-card hover:bg-surface-2',
    ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
    danger: 'bg-danger text-on-danger shadow-card hover:bg-danger-hover',
    soft: 'bg-primary-soft text-primary-ink hover:bg-primary/20',
    'danger-soft': 'bg-danger-soft text-danger-ink hover:bg-danger/20',
    rail: 'text-rail-ink-2 hover:bg-rail-2 hover:text-rail-ink',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
    xs: 'h-7 gap-1.5 rounded-md px-2.5 text-xs',
    sm: 'h-8 gap-1.5 rounded-lg px-3 text-[13px]',
    md: 'h-9 gap-2 rounded-lg px-4 text-sm',
    lg: 'h-11 gap-2 rounded-xl px-5 text-[15px]',
};

const ICON_BUTTON_SIZES: Record<ButtonSize, string> = {
    xs: 'size-7 rounded-md',
    sm: 'size-8 rounded-lg',
    md: 'size-9 rounded-lg',
    lg: 'size-11 rounded-xl',
};

export function buttonClass(
    variant: ButtonVariant = 'primary',
    size: ButtonSize = 'md',
    className?: string,
): string {
    return cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow,opacity] duration-150 active:translate-y-px disabled:opacity-50 disabled:active:translate-y-0',
        BUTTON_SIZES[size],
        BUTTON_VARIANTS[variant],
        className,
    );
}

/**
 * Click handler that may be async. When it returns a promise the button shows its loader
 * and ignores further clicks until the promise settles. A rejection is not swallowed: it
 * reaches the global handler (shared/api/errors.ts), which shows a translated toast.
 * For confirm dialogs, success toasts or form errors use `useAsyncAction` instead.
 */
export type AsyncClickHandler = (event: MouseEvent<HTMLButtonElement>) => void | Promise<unknown>;

const LOADER_SIZE: Record<ButtonSize, 'xs' | 'sm'> = { xs: 'xs', sm: 'xs', md: 'sm', lg: 'sm' };

/** Pending state of an async click handler (see AsyncClickHandler). */
function useAsyncClick(onClick: AsyncClickHandler | undefined) {
    const [pending, setPending] = useState(false);
    const busy = useRef(false);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        if (busy.current || !onClick) return;
        const result = onClick(event);
        if (!result || typeof (result as Promise<unknown>).then !== 'function') return;
        busy.current = true;
        setPending(true);
        void (result as Promise<unknown>).finally(() => {
            busy.current = false;
            if (mounted.current) setPending(false);
        });
    };
    return { pending, handleClick };
}

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Controlled loading state; an async `onClick` sets it automatically. */
    loading?: boolean;
    icon?: ReactNode;
    onClick?: AsyncClickHandler;
};

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    className,
    children,
    disabled,
    type = 'button',
    onClick,
    ...rest
}: ButtonProps) {
    const { pending, handleClick } = useAsyncClick(onClick);
    const busy = loading || pending;
    return (
        <button
            type={type}
            disabled={disabled || busy}
            aria-busy={busy || undefined}
            className={buttonClass(variant, size, className)}
            onClick={handleClick}
            {...rest}
        >
            {busy ? <Loader size={LOADER_SIZE[size]} tone="current" label={null} /> : icon}
            {children}
        </button>
    );
}

/** Square button with an icon only. `label` becomes the tooltip and the accessible name. */
export function IconButton({
    label,
    icon,
    variant = 'ghost',
    size = 'md',
    loading = false,
    className,
    disabled,
    type = 'button',
    onClick,
    ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> & {
    label: string;
    icon: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    onClick?: AsyncClickHandler;
}) {
    const { pending, handleClick } = useAsyncClick(onClick);
    const busy = loading || pending;
    return (
        <button
            type={type}
            title={label}
            aria-label={label}
            aria-busy={busy || undefined}
            disabled={disabled || busy}
            className={cn(
                'inline-flex shrink-0 items-center justify-center transition-colors duration-150 disabled:opacity-40',
                ICON_BUTTON_SIZES[size],
                BUTTON_VARIANTS[variant],
                className,
            )}
            onClick={handleClick}
            {...rest}
        >
            {busy ? <Loader size={LOADER_SIZE[size]} tone="current" label={null} /> : icon}
        </button>
    );
}

/** Small loader for places that only need an indicator (kept for existing callers). */
export function Spinner({ className }: { className?: string }) {
    return <Loader size="md" className={className} />;
}

// ------------------------------------------------------------------ Form fields

type FieldShellProps = {
    label?: ReactNode;
    hint?: ReactNode;
    error?: string | null;
    htmlFor?: string;
    className?: string;
    required?: boolean;
    children: ReactNode;
};

/** Label + control + hint/error, for custom controls. */
export function FieldShell({
    label,
    hint,
    error,
    htmlFor,
    className,
    required,
    children,
}: FieldShellProps) {
    return (
        <div className={className}>
            {label && (
                <label htmlFor={htmlFor} className="label">
                    {label}
                    {required && <span className="ml-0.5 text-danger">*</span>}
                </label>
            )}
            {children}
            {error ? (
                <p className="mt-1.5 text-xs text-danger-ink">{error}</p>
            ) : (
                hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>
            )}
        </div>
    );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    hint?: string;
    error?: string | null;
};

export function TextField({ label, hint, error, className, id, ...rest }: FieldProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
        <FieldShell label={label} hint={hint} error={error} htmlFor={inputId} className={className}>
            <input id={inputId} className="field" aria-invalid={Boolean(error)} {...rest} />
        </FieldShell>
    );
}

export function TextAreaField({
    label,
    hint,
    error,
    className,
    id,
    ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label: string;
    hint?: string;
    error?: string | null;
}) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
        <FieldShell label={label} hint={hint} error={error} htmlFor={inputId} className={className}>
            <textarea id={inputId} className="field" aria-invalid={Boolean(error)} {...rest} />
        </FieldShell>
    );
}

export function PasswordField({ label, hint, error, className, id, ...rest }: FieldProps) {
    const [visible, setVisible] = useState(false);
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
        <FieldShell label={label} hint={hint} error={error} htmlFor={inputId} className={className}>
            <div className="relative">
                <input
                    id={inputId}
                    type={visible ? 'text' : 'password'}
                    autoComplete="off"
                    spellCheck={false}
                    className="field pr-10"
                    aria-invalid={Boolean(error)}
                    {...rest}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setVisible((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-3 transition-colors hover:text-ink"
                    aria-label={visible ? 'Приховати пароль' : 'Показати пароль'}
                >
                    {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
            </div>
        </FieldShell>
    );
}

export function SelectField({
    label,
    value,
    onChange,
    options,
    disabled,
    className,
}: {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    options: { value: string | number; label: string }[];
    disabled?: boolean;
    className?: string;
}) {
    const id = useId();
    return (
        <FieldShell label={label} htmlFor={id} className={className}>
            <select
                id={id}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className="field"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </FieldShell>
    );
}

export function Checkbox({
    checked,
    onChange,
    label,
    description,
    disabled,
    className,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: ReactNode;
    description?: ReactNode;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <label
            className={cn(
                'flex items-start gap-2.5 text-sm text-ink',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                className,
            )}
        >
            <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span className="min-w-0">
                {label}
                {description && (
                    <span className="mt-0.5 block text-xs text-ink-3">{description}</span>
                )}
            </span>
        </label>
    );
}

/** Search box with an icon and a clear button. */
export function SearchInput({
    value,
    onChange,
    placeholder,
    className,
    size = 'md',
    autoFocus,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    size?: 'sm' | 'md';
    autoFocus?: boolean;
}) {
    return (
        <div className={cn('relative', className)}>
            <Search
                className={cn(
                    'pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-3',
                    size === 'sm' ? 'left-2.5 size-3.5' : 'left-3 size-4',
                )}
            />
            <input
                type="text"
                value={value}
                autoFocus={autoFocus}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn('field', size === 'sm' ? 'field-sm pl-8 pr-7' : 'pl-9 pr-8')}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
                    aria-label="Очистити"
                >
                    <X className="size-3.5" />
                </button>
            )}
        </div>
    );
}

// ------------------------------------------------------------------ Feedback

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const ALERT_TONES: Record<AlertTone, { box: string; icon: ReactNode }> = {
    info: {
        box: 'border-info-line bg-info-soft text-info-ink',
        icon: <Info className="size-4 shrink-0" />,
    },
    success: {
        box: 'border-success-line bg-success-soft text-success-ink',
        icon: <CheckCircle2 className="size-4 shrink-0" />,
    },
    warning: {
        box: 'border-warning-line bg-warning-soft text-warning-ink',
        icon: <AlertTriangle className="size-4 shrink-0" />,
    },
    error: {
        box: 'border-danger-line bg-danger-soft text-danger-ink',
        icon: <XCircle className="size-4 shrink-0" />,
    },
};

export function Alert({
    tone = 'info',
    title,
    children,
    className,
    icon,
}: {
    tone?: AlertTone;
    title?: ReactNode;
    children?: ReactNode;
    className?: string;
    icon?: ReactNode;
}) {
    const style = ALERT_TONES[tone];
    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={cn(
                'flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm',
                style.box,
                className,
            )}
        >
            <span className="mt-0.5">{icon ?? style.icon}</span>
            <div className="min-w-0 space-y-1">
                {title && <p className="font-semibold">{title}</p>}
                {children && <div className="leading-relaxed">{children}</div>}
            </div>
        </div>
    );
}

export type BadgeTone = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'olive' | 'brass';

const BADGE_TONES: Record<BadgeTone, string> = {
    gray: 'bg-surface-3 text-ink-2',
    blue: 'bg-info-soft text-info-ink',
    green: 'bg-success-soft text-success-ink',
    red: 'bg-danger-soft text-danger-ink',
    amber: 'bg-warning-soft text-warning-ink',
    olive: 'bg-primary-soft text-primary-ink',
    brass: 'bg-brass-soft text-brass-ink',
};

export function Badge({
    tone = 'gray',
    children,
    className,
}: {
    tone?: BadgeTone;
    children: ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                BADGE_TONES[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}

/** Pill button placed on the dark title bar (alerts that need attention). */
export function railChipClass(tone: 'brass' | 'danger'): string {
    return cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors',
        tone === 'brass'
            ? 'bg-[oklch(79%_0.12_82/0.16)] text-[oklch(86%_0.11_85)] hover:bg-[oklch(79%_0.12_82/0.26)]'
            : 'bg-[oklch(60%_0.19_27/0.22)] text-[oklch(85%_0.09_25)] hover:bg-[oklch(60%_0.19_27/0.32)]',
    );
}

/** Numeric counter bubble (navigation, tabs). */
export function Count({
    value,
    tone = 'gray',
}: {
    value: number;
    tone?: 'gray' | 'red' | 'brass';
}) {
    return (
        <span
            className={cn(
                'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                tone === 'red' && 'bg-danger text-on-danger',
                tone === 'brass' && 'bg-brass text-[oklch(22%_0.03_80)]',
                tone === 'gray' && 'bg-surface-3 text-ink-2',
            )}
        >
            {value}
        </span>
    );
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: {
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
                className,
            )}
        >
            {icon && (
                <div className="relative grid size-14 place-items-center overflow-hidden rounded-2xl border border-line bg-surface-2 text-ink-3 [&_svg]:size-6">
                    <div className="topo absolute inset-0 text-ink-3 opacity-15" />
                    <span className="relative">{icon}</span>
                </div>
            )}
            <div className="max-w-md space-y-1">
                <p className="text-[15px] font-semibold text-ink">{title}</p>
                {description && <p className="text-sm leading-relaxed text-ink-3">{description}</p>}
            </div>
            {action}
        </div>
    );
}

// ------------------------------------------------------------------ Identity

function hashHue(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 360;
    return hash;
}

export function initials(name: string | null | undefined): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** Photo or initials on a colour derived from the name (stable per person). */
export function Avatar({
    name,
    src,
    size = 36,
    className,
    rounded = 'rounded-full',
}: {
    name: string | null | undefined;
    src?: string | null;
    size?: number;
    className?: string;
    rounded?: string;
}) {
    const style = { width: size, height: size, fontSize: Math.max(10, size * 0.38) };
    if (src) {
        return (
            <img
                src={src}
                alt=""
                style={style}
                className={cn('shrink-0 object-cover', rounded, className)}
            />
        );
    }
    return (
        <span
            style={{ ...style, ['--th' as string]: hashHue(name ?? '') }}
            className={cn(
                'tone inline-flex shrink-0 select-none items-center justify-center border font-semibold',
                rounded,
                className,
            )}
        >
            {initials(name)}
        </span>
    );
}

// ------------------------------------------------------------------ Layout

export function Card({
    title,
    description,
    actions,
    children,
    className,
    icon,
}: {
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
    className?: string;
    icon?: ReactNode;
}) {
    return (
        <section className={cn('card p-5', className)}>
            {(title || actions) && (
                <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        {icon && (
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink [&_svg]:size-[18px]">
                                {icon}
                            </span>
                        )}
                        <div className="min-w-0">
                            {title && (
                                <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
                            )}
                            {description && (
                                <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-ink-3">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </header>
            )}
            {children}
        </section>
    );
}

export type TabItem<T extends string> = {
    value: T;
    label: ReactNode;
    icon?: ReactNode;
    count?: number;
    hidden?: boolean;
};

/**
 * Section switcher. `underline` for page-level sections, `pills` for compact view toggles.
 */
export function Tabs<T extends string>({
    value,
    onChange,
    items,
    variant = 'underline',
    className,
}: {
    value: T;
    onChange: (value: NoInfer<T>) => void;
    items: TabItem<NoInfer<T>>[];
    variant?: 'underline' | 'pills';
    className?: string;
}) {
    const visible = items.filter((item) => !item.hidden);
    if (variant === 'pills') {
        return (
            <div
                role="tablist"
                className={cn(
                    'inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-line bg-surface-2 p-0.5',
                    className,
                )}
            >
                {visible.map((item) => {
                    const active = item.value === value;
                    return (
                        <button
                            key={item.value}
                            role="tab"
                            aria-selected={active}
                            onClick={() => onChange(item.value)}
                            className={cn(
                                'inline-flex h-8 shrink-0 items-center gap-2 rounded-[10px] px-3 text-[13px] font-medium transition-all [&_svg]:size-4',
                                active
                                    ? 'bg-surface text-ink shadow-card'
                                    : 'text-ink-3 hover:text-ink',
                            )}
                        >
                            {item.icon}
                            {item.label}
                            {item.count !== undefined && (
                                <span className="text-xs tabular-nums text-ink-3">
                                    {item.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }
    return (
        <div
            role="tablist"
            className={cn('flex max-w-full items-stretch gap-1 overflow-x-auto', className)}
        >
            {visible.map((item) => {
                const active = item.value === value;
                return (
                    <button
                        key={item.value}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(item.value)}
                        className={cn(
                            'relative inline-flex h-12 shrink-0 items-center gap-2 px-3 text-sm font-medium transition-colors [&_svg]:size-4',
                            active ? 'text-ink' : 'text-ink-3 hover:text-ink',
                        )}
                    >
                        {item.icon}
                        {item.label}
                        {item.count !== undefined && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                                    active
                                        ? 'bg-primary-soft text-primary-ink'
                                        : 'bg-surface-3 text-ink-3',
                                )}
                            >
                                {item.count}
                            </span>
                        )}
                        <span
                            className={cn(
                                'absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-colors',
                                active ? 'bg-primary' : 'bg-transparent',
                            )}
                        />
                    </button>
                );
            })}
        </div>
    );
}

// ------------------------------------------------------------------ Overlays

/** Only the top-most overlay reacts to Escape. */
const overlayStack: number[] = [];
let overlaySeq = 0;

function useOverlayEscape(open: boolean, onClose: () => void) {
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        if (!open) return;
        const id = ++overlaySeq;
        overlayStack.push(id);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && overlayStack[overlayStack.length - 1] === id) {
                e.stopPropagation();
                closeRef.current();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            const index = overlayStack.indexOf(id);
            if (index >= 0) overlayStack.splice(index, 1);
        };
    }, [open]);
}

export function Modal({
    open,
    title,
    description,
    icon,
    onClose,
    children,
    footer,
    width = 'max-w-lg',
    bodyClassName,
    closeOnBackdrop = true,
}: {
    open: boolean;
    title: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    width?: string;
    bodyClassName?: string;
    closeOnBackdrop?: boolean;
}) {
    useOverlayEscape(open, onClose);
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-x-0 bottom-0 top-10 z-[60] flex items-center justify-center p-3 sm:p-6">
            <div
                className="absolute inset-0 animate-fade-in bg-scrim backdrop-blur-[2px]"
                onMouseDown={closeOnBackdrop ? onClose : undefined}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === 'string' ? title : undefined}
                className={cn(
                    'relative flex max-h-full w-full animate-pop-in flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop',
                    width,
                )}
            >
                <div className="flex items-start gap-3 border-b border-line px-5 py-4">
                    {icon && (
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink [&_svg]:size-[18px]">
                            {icon}
                        </span>
                    )}
                    <div className="min-w-0 flex-1 pt-0.5">
                        <h3 className="text-base font-semibold leading-snug text-ink">{title}</h3>
                        {description && (
                            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">
                                {description}
                            </p>
                        )}
                    </div>
                    <IconButton
                        label="Закрити"
                        size="sm"
                        onClick={onClose}
                        icon={<X className="size-4" />}
                        className="-mr-1.5 -mt-0.5"
                    />
                </div>
                {/* `bodyClassName` replaces the default padding (Tailwind cannot merge them). */}
                <div className={cn('min-h-0 flex-1 overflow-y-auto', bodyClassName ?? 'px-5 py-5')}>
                    {children}
                </div>
                {footer && (
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}

/** Panel sliding in from the right edge. */
export function Drawer({
    open,
    title,
    icon,
    onClose,
    children,
    width = 'w-[440px]',
}: {
    open: boolean;
    title: ReactNode;
    icon?: ReactNode;
    onClose: () => void;
    children: ReactNode;
    width?: string;
}) {
    useOverlayEscape(open, onClose);
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-x-0 bottom-0 top-10 z-[60]">
            <div className="absolute inset-0 animate-fade-in bg-scrim" onMouseDown={onClose} />
            <aside
                role="dialog"
                aria-modal="true"
                className={cn(
                    'absolute inset-y-0 right-0 flex max-w-[92vw] animate-slide-in flex-col border-l border-line bg-surface shadow-pop',
                    width,
                )}
            >
                <div className="flex items-center gap-3 border-b border-line px-5 py-4">
                    {icon && (
                        <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary-ink [&_svg]:size-[18px]">
                            {icon}
                        </span>
                    )}
                    <h3 className="min-w-0 flex-1 text-base font-semibold text-ink">{title}</h3>
                    <IconButton
                        label="Закрити"
                        size="sm"
                        onClick={onClose}
                        icon={<X className="size-4" />}
                    />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
            </aside>
        </div>,
        document.body,
    );
}

// ------------------------------------------------------------------ Formatting

export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 Б';
    const units = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatDate(value: string | number | Date | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('uk-UA');
}
