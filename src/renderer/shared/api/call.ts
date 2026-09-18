import {
    ERROR_CODES,
    type ErrorCode,
    type Fail,
    IPC_ERROR_PREFIX,
    type Result,
} from '../../../shared/ipc/result';

/** Error thrown by `unwrap` — carries a stable code the UI can translate. */
export class ApiError extends Error {
    constructor(
        readonly code: ErrorCode,
        message?: string,
        readonly details?: Record<string, unknown>,
    ) {
        super(message ?? code);
        this.name = 'ApiError';
    }
}

const KNOWN_CODES = new Set<string>(ERROR_CODES);

/** Normalizes anything thrown by an IPC call (rejections carry `PMA_ERROR:<code>`). */
export function toApiError(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    const message = error instanceof Error ? error.message : String(error);
    const index = message.indexOf(IPC_ERROR_PREFIX);
    if (index >= 0) {
        const code = message.slice(index + IPC_ERROR_PREFIX.length).match(/^[A-Z_]+/)?.[0] ?? '';
        if (KNOWN_CODES.has(code)) return new ApiError(code as ErrorCode);
    }
    return new ApiError('INTERNAL', message);
}

/** Resolves a `Result` envelope to its data or throws `ApiError`. */
export async function unwrap<T>(call: Promise<Result<T>>): Promise<T> {
    let result: Result<T>;
    try {
        result = await call;
    } catch (error) {
        throw toApiError(error);
    }
    if (result.ok) return result.data;
    // Explicit cast: the project compiles without strictNullChecks, which disables union narrowing here.
    const failure = result as Fail;
    throw new ApiError(failure.error, failure.message, failure.details);
}

/** Codes whose server message is already a user-facing Ukrainian sentence. */
const SERVER_MESSAGE_CODES = new Set<ErrorCode>([
    'VALIDATION',
    'CONFLICT',
    'LAST_ADMIN',
    'STORAGE',
]);

export function errorMessage(
    error: unknown,
    t: (key: string, vars?: Record<string, any>) => string,
): string {
    const apiError = toApiError(error);
    if (
        SERVER_MESSAGE_CODES.has(apiError.code) &&
        apiError.message &&
        apiError.message !== apiError.code
    ) {
        return apiError.message;
    }
    if (apiError.code === 'ACCOUNT_LOCKED' && typeof apiError.details?.lockedUntil === 'string') {
        return t('errors.ACCOUNT_LOCKED_UNTIL', {
            time: new Date(apiError.details.lockedUntil).toLocaleTimeString('uk-UA', {
                hour: '2-digit',
                minute: '2-digit',
            }),
        });
    }
    return t(`errors.${apiError.code}`);
}
