import type { ErrorCode } from '../../../shared/ipc/result';
import { useI18nStore } from '../../stores/i18nStore';
import { toast } from '../ui/toast';
import { type ApiError, errorMessage, toApiError } from './call';

/** The session ended or lost rights: the user must see why the action did nothing. */
const ACCESS_CODES = new Set<ErrorCode>([
    'FORBIDDEN',
    'UNAUTHENTICATED',
    'PASSWORD_CHANGE_REQUIRED',
]);

/** Nothing to report: the user closed a dialog. */
const QUIET_CODES = new Set<ErrorCode>(['CANCELED']);

/** Identical messages within this window are shown once (a failing list of 20 calls → 1 toast). */
const DEDUPE_MS = 1500;
const recent = new Map<string, number>();

function showOnce(message: string): void {
    const now = Date.now();
    const last = recent.get(message);
    if (last && now - last < DEDUPE_MS) return;
    recent.set(message, now);
    toast.error(message);
}

export type ReportOptions = {
    /** Text to show instead of the translated error (e.g. "Не вдалося зберегти особу"). */
    message?: string;
    /** Where it happened, for the log only (never shown). */
    context?: string;
};

/**
 * The one way to tell the user an operation failed: translates the error, shows a toast
 * (deduplicated) and writes unexpected errors to the console, which the main process keeps
 * in its log. Returns the normalized error for callers that also need the code.
 */
export function reportError(error: unknown, options: ReportOptions = {}): ApiError {
    const apiError = toApiError(error);
    if (QUIET_CODES.has(apiError.code)) return apiError;

    if (apiError.code === 'INTERNAL') {
        console.error(`[${options.context ?? 'ui'}]`, error);
    }
    const { t } = useI18nStore.getState();
    showOnce(options.message ?? errorMessage(apiError, t));
    return apiError;
}

let installed = false;

/**
 * Safety net for failures nobody handled (older screens, event handlers without a catch):
 * instead of failing silently in the console, the user gets a readable notification.
 * Call once before the first render.
 */
export function installGlobalErrorHandlers(): void {
    if (installed) return;
    installed = true;

    window.addEventListener('unhandledrejection', (event) => {
        if (event.defaultPrevented) return;
        event.preventDefault();
        const apiError = toApiError(event.reason);
        if (ACCESS_CODES.has(apiError.code)) {
            showOnce(useI18nStore.getState().t(`errors.${apiError.code}`));
            return;
        }
        reportError(event.reason, { context: 'unhandled rejection' });
    });

    window.addEventListener('error', (event) => {
        // Resource load errors (an <img> that failed) have no `error` and are not app failures.
        if (!event.error) return;
        console.error('[uncaught]', event.error);
    });
}
