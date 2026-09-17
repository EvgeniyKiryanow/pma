import { AlertTriangle, CheckCircle2, Eye, EyeOff, Info, Loader2, X, XCircle } from 'lucide-react';
import {
    type ButtonHTMLAttributes,
    type InputHTMLAttributes,
    type ReactNode,
    useEffect,
    useId,
    useState,
} from 'react';

/**
 * Small set of UI primitives for new screens (auth, administration, backups).
 * Styling follows the existing Tailwind look of the app: blue accents, rounded cards.
 */

export function cn(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}

// ------------------------------------------------------------------ Button

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
    secondary:
        'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 disabled:text-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 disabled:text-gray-400',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: 'sm' | 'md';
    loading?: boolean;
    icon?: ReactNode;
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
    ...rest
}: ButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg font-medium shadow-sm transition disabled:cursor-not-allowed',
                size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
                BUTTON_VARIANTS[variant],
                className,
            )}
            {...rest}
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
            {children}
        </button>
    );
}

// ------------------------------------------------------------------ Form fields

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    hint?: string;
    error?: string | null;
};

const INPUT_CLASS =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100';

export function TextField({ label, hint, error, className, id, ...rest }: FieldProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
        <div className={className}>
            <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">
                {label}
            </label>
            <input
                id={inputId}
                className={cn(INPUT_CLASS, error && 'border-red-400 focus:ring-red-200')}
                aria-invalid={Boolean(error)}
                {...rest}
            />
            {error ? (
                <p className="mt-1 text-xs text-red-600">{error}</p>
            ) : (
                hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>
            )}
        </div>
    );
}

export function PasswordField({ label, hint, error, className, id, ...rest }: FieldProps) {
    const [visible, setVisible] = useState(false);
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
        <div className={className}>
            <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">
                {label}
            </label>
            <div className="relative">
                <input
                    id={inputId}
                    type={visible ? 'text' : 'password'}
                    autoComplete="off"
                    spellCheck={false}
                    className={cn(
                        INPUT_CLASS,
                        'pr-10',
                        error && 'border-red-400 focus:ring-red-200',
                    )}
                    aria-invalid={Boolean(error)}
                    {...rest}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setVisible((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-400 hover:text-gray-600"
                    aria-label={visible ? 'Приховати пароль' : 'Показати пароль'}
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
            {error ? (
                <p className="mt-1 text-xs text-red-600">{error}</p>
            ) : (
                hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>
            )}
        </div>
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
        <div className={className}>
            <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
                {label}
            </label>
            <select
                id={id}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className={INPUT_CLASS}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

// ------------------------------------------------------------------ Feedback

type AlertTone = 'info' | 'success' | 'warning' | 'error';

const ALERT_TONES: Record<AlertTone, { box: string; icon: ReactNode }> = {
    info: {
        box: 'bg-blue-50 border-blue-200 text-blue-900',
        icon: <Info className="h-4 w-4 shrink-0" />,
    },
    success: {
        box: 'bg-green-50 border-green-200 text-green-900',
        icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
    },
    warning: {
        box: 'bg-amber-50 border-amber-200 text-amber-900',
        icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
    },
    error: {
        box: 'bg-red-50 border-red-200 text-red-900',
        icon: <XCircle className="h-4 w-4 shrink-0" />,
    },
};

export function Alert({
    tone = 'info',
    title,
    children,
    className,
}: {
    tone?: AlertTone;
    title?: string;
    children?: ReactNode;
    className?: string;
}) {
    const style = ALERT_TONES[tone];
    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={cn('flex gap-2 rounded-lg border p-3 text-sm', style.box, className)}
        >
            <span className="mt-0.5">{style.icon}</span>
            <div className="min-w-0 space-y-1">
                {title && <p className="font-semibold">{title}</p>}
                {children && <div className="leading-relaxed">{children}</div>}
            </div>
        </div>
    );
}

export function Badge({
    tone = 'gray',
    children,
}: {
    tone?: 'gray' | 'blue' | 'green' | 'red' | 'amber';
    children: ReactNode;
}) {
    const tones = {
        gray: 'bg-gray-100 text-gray-700',
        blue: 'bg-blue-100 text-blue-800',
        green: 'bg-green-100 text-green-800',
        red: 'bg-red-100 text-red-800',
        amber: 'bg-amber-100 text-amber-800',
    };
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                tones[tone],
            )}
        >
            {children}
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
}: {
    title?: string;
    description?: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn('rounded-xl border border-gray-200 bg-white p-5 shadow-sm', className)}
        >
            {(title || actions) && (
                <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
                        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
                    </div>
                    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </header>
            )}
            {children}
        </section>
    );
}

export function Modal({
    open,
    title,
    onClose,
    children,
    footer,
    width = 'max-w-lg',
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    width?: string;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
            onMouseDown={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={cn(
                    'flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-xl',
                    width,
                )}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b px-5 py-3">
                    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label="Закрити"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="overflow-y-auto px-5 py-4">{children}</div>
                {footer && (
                    <div className="flex justify-end gap-2 border-t px-5 py-3">{footer}</div>
                )}
            </div>
        </div>
    );
}

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
