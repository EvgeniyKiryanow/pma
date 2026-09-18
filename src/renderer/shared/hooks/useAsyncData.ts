import { type DependencyList, useCallback, useEffect, useRef, useState } from 'react';

import { type ApiError, toApiError } from '../api/call';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export type AsyncData<T> = {
    data: T | undefined;
    status: AsyncStatus;
    error: ApiError | null;
    /** First load in progress (nothing to show yet) — render a loader or skeleton. */
    isLoading: boolean;
    /** Reload in progress while old data stays on screen — render a thin progress bar. */
    isRefreshing: boolean;
    /** Loads again; resolves when done. Safe to call from buttons and after mutations. */
    reload: () => Promise<void>;
    /** Local update after a mutation, without a round trip (optimistic or from the reply). */
    setData: (update: T | ((current: T | undefined) => T)) => void;
};

export type AsyncDataOptions<T> = {
    /** `false` skips loading (e.g. until an id is selected). Default true. */
    enabled?: boolean;
    /** Value before the first load finishes. */
    initialData?: T;
};

/**
 * Loads data for a screen with explicit states. Only the latest request may update the
 * state, so a slow answer for an old selection never overwrites the current one.
 * Errors are kept in `error` (render them with <AsyncContent>), not thrown.
 */
export function useAsyncData<T>(
    load: () => Promise<T>,
    deps: DependencyList,
    { enabled = true, initialData }: AsyncDataOptions<T> = {},
): AsyncData<T> {
    const [data, setDataState] = useState<T | undefined>(initialData);
    const [status, setStatus] = useState<AsyncStatus>(enabled ? 'loading' : 'idle');
    const [error, setError] = useState<ApiError | null>(null);
    const [hasData, setHasData] = useState(initialData !== undefined);

    const loadRef = useRef(load);
    loadRef.current = load;
    const requestId = useRef(0);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const reload = useCallback(async () => {
        const id = ++requestId.current;
        setStatus('loading');
        setError(null);
        try {
            const result = await loadRef.current();
            if (!mounted.current || id !== requestId.current) return;
            setDataState(result);
            setHasData(true);
            setStatus('success');
        } catch (err) {
            if (!mounted.current || id !== requestId.current) return;
            const apiError = toApiError(err);
            if (apiError.code === 'INTERNAL') console.error('[load]', err);
            setError(apiError);
            setStatus('error');
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            requestId.current++;
            setStatus('idle');
            return;
        }
        void reload();
        // `deps` are the caller's inputs (like useEffect); `reload` itself is stable.
    }, [enabled, reload, ...deps]);

    const setData = useCallback((update: T | ((current: T | undefined) => T)) => {
        setDataState((current) =>
            typeof update === 'function' ? (update as (c: T | undefined) => T)(current) : update,
        );
        setHasData(true);
    }, []);

    return {
        data,
        status,
        error,
        isLoading: status === 'loading' && !hasData,
        isRefreshing: status === 'loading' && hasData,
        reload,
        setData,
    };
}
