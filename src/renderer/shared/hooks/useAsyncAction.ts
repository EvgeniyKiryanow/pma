import { useCallback, useEffect, useRef, useState } from 'react';

import { type ApiError, toApiError } from '../api/call';
import { reportError } from '../api/errors';
import { confirmAction, type ConfirmOptions } from '../ui/confirm';
import { toast } from '../ui/toast';

export type AsyncActionOptions<A extends unknown[], R> = {
    /** Ask first (delete, exclude, reset...). The action runs only when confirmed. */
    confirm?: ConfirmOptions | ((...args: A) => ConfirmOptions);
    /** Toast after success. */
    success?: string | ((result: R) => string | null | undefined);
    /** Toast text on failure; `false` when the caller shows the error itself (e.g. in a form). */
    error?: string | false;
    onSuccess?: (result: R) => void;
    onError?: (error: ApiError) => void;
    /** Log context for unexpected errors. */
    context?: string;
};

export type AsyncAction<A extends unknown[], R> = {
    /** Runs the action; resolves to the result, or `undefined` if it failed or was declined. */
    run: (...args: A) => Promise<R | undefined>;
    /** True while running — bind to `loading` / `disabled` of the button. */
    pending: boolean;
    /** Last failure, cleared by the next run or `reset()`. */
    error: ApiError | null;
    reset: () => void;
};

/**
 * Standard handling of a user action that talks to the main process (save, delete, export):
 * - a second click while it runs is ignored (no double submissions);
 * - `pending` drives the button's loader;
 * - failures become a translated toast (or `error` state for forms), never a silent console line;
 * - state is not updated after the component unmounted.
 *
 * `run` is stable, so it can be passed to children and effects freely.
 */
export function useAsyncAction<A extends unknown[], R>(
    action: (...args: A) => Promise<R>,
    options: AsyncActionOptions<A, R> = {},
): AsyncAction<A, R> {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);

    // Latest action/options without making `run` change on every render.
    const latest = useRef({ action, options });
    latest.current = { action, options };
    const running = useRef(false);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const run = useCallback(async (...args: A): Promise<R | undefined> => {
        if (running.current) return undefined;
        const { action: current, options: opts } = latest.current;

        if (opts.confirm) {
            const confirmOptions =
                typeof opts.confirm === 'function' ? opts.confirm(...args) : opts.confirm;
            if (!(await confirmAction(confirmOptions))) return undefined;
        }

        running.current = true;
        if (mounted.current) {
            setPending(true);
            setError(null);
        }
        try {
            const result = await current(...args);
            const message =
                typeof opts.success === 'function' ? opts.success(result) : opts.success;
            if (message) toast.success(message);
            opts.onSuccess?.(result);
            return result;
        } catch (err) {
            const apiError =
                opts.error === false
                    ? reportSilently(err)
                    : reportError(err, { message: opts.error || undefined, context: opts.context });
            if (mounted.current) setError(apiError);
            opts.onError?.(apiError);
            return undefined;
        } finally {
            running.current = false;
            if (mounted.current) setPending(false);
        }
    }, []);

    const reset = useCallback(() => setError(null), []);

    return { run, pending, error, reset };
}

/** Normalizes without a toast: the caller renders the error next to the form. */
function reportSilently(err: unknown): ApiError {
    const apiError = toApiError(err);
    if (apiError.code === 'INTERNAL') console.error('[action]', err);
    return apiError;
}
