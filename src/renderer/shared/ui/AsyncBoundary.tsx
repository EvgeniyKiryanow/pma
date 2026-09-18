import { AlertTriangle, RotateCcw } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { useI18nStore } from '../../stores/i18nStore';
import { errorMessage } from '../api/call';
import type { AsyncData } from '../hooks/useAsyncData';
import { Button, cn } from './index';
import { PageLoader, ProgressBar } from './loader';

/** Translation with a fallback while a key is not in the locale files yet. */
function useText() {
    const t = useI18nStore((s) => s.t);
    return (key: string, fallback: string) => {
        const value = t(key);
        return value === key ? fallback : value;
    };
}

type ErrorStateProps = {
    error: unknown;
    title?: ReactNode;
    onRetry?: () => void | Promise<void>;
    className?: string;
};

/** Failed load with the reason and a retry button. */
export function ErrorState({ error, title, onRetry, className }: ErrorStateProps) {
    const t = useI18nStore((s) => s.t);
    const text = useText();
    const [retrying, setRetrying] = useState(false);

    const retry = async () => {
        if (!onRetry) return;
        setRetrying(true);
        try {
            await onRetry();
        } finally {
            setRetrying(false);
        }
    };

    return (
        <div
            role="alert"
            className={cn(
                'flex min-h-[200px] w-full flex-col items-center justify-center gap-3 px-6 py-10 text-center',
                className,
            )}
        >
            <span className="grid size-11 place-items-center rounded-full bg-danger-soft text-danger-ink">
                <AlertTriangle className="size-5" />
            </span>
            <div className="max-w-md">
                <p className="font-semibold text-ink">
                    {title ?? text('common.loadFailed', 'Не вдалося завантажити дані')}
                </p>
                <p className="mt-1 text-sm text-ink-3">{errorMessage(error, t)}</p>
            </div>
            {onRetry && (
                <Button
                    variant="secondary"
                    size="sm"
                    loading={retrying}
                    icon={<RotateCcw className="size-3.5" />}
                    onClick={retry}
                >
                    {text('common.retry', 'Спробувати ще раз')}
                </Button>
            )}
        </div>
    );
}

type AsyncContentProps<T> = {
    state: AsyncData<T>;
    /** What to show during the first load; defaults to <PageLoader />. */
    loading?: ReactNode;
    /** Treat the loaded data as empty (e.g. `(rows) => rows.length === 0`). */
    isEmpty?: (data: T) => boolean;
    /** Shown when `isEmpty` returns true (usually an <EmptyState />). */
    empty?: ReactNode;
    errorTitle?: ReactNode;
    className?: string;
    children: (data: T) => ReactNode;
};

/**
 * One switch for the four states of loaded data — loading, error (with retry), empty,
 * content — so every screen handles them the same way. A reload keeps the content on screen
 * with a thin progress bar instead of blanking it.
 */
export function AsyncContent<T>({
    state,
    loading,
    isEmpty,
    empty,
    errorTitle,
    className,
    children,
}: AsyncContentProps<T>) {
    if (state.isLoading || (state.status === 'idle' && state.data === undefined)) {
        return <>{loading ?? <PageLoader />}</>;
    }
    if (state.status === 'error' && state.data === undefined) {
        return <ErrorState error={state.error} title={errorTitle} onRetry={state.reload} />;
    }
    const data = state.data as T;
    const content = isEmpty?.(data) && empty !== undefined ? empty : children(data);
    return (
        <div className={cn('relative', className)} aria-busy={state.isRefreshing || undefined}>
            <ProgressBar active={state.isRefreshing} className="absolute inset-x-0 top-0 z-10" />
            {state.status === 'error' && (
                <ErrorState
                    error={state.error}
                    title={errorTitle}
                    onRetry={state.reload}
                    className="min-h-0 py-4"
                />
            )}
            {content}
        </div>
    );
}
