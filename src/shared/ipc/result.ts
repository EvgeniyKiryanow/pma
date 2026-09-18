/**
 * Envelope for IPC calls that can fail for domain reasons (validation, conflicts, wrong password...).
 * Access-control failures are not returned here: the main process rejects the call instead.
 */

export const ERROR_CODES = [
    'VALIDATION',
    'NOT_FOUND',
    'CONFLICT',
    'INVALID_CREDENTIALS',
    'ACCOUNT_LOCKED',
    'ACCOUNT_INACTIVE',
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'PASSWORD_CHANGE_REQUIRED',
    'LAST_ADMIN',
    'SETUP_ALREADY_DONE',
    'INVALID_PASSWORD',
    'UNSUPPORTED_FORMAT',
    'CORRUPTED',
    'SCHEMA_TOO_NEW',
    'CANCELED',
    'NOTHING_SELECTED',
    'DATA_LOCKED',
    'UPDATE_FAILED',
    /** A disk operation failed for a reason the person can fix (space, write protection...). */
    'STORAGE',
    'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type Ok<T> = { ok: true; data: T };
export type Fail = {
    ok: false;
    error: ErrorCode;
    message?: string;
    details?: Record<string, unknown>;
};
export type Result<T = void> = Ok<T> | Fail;

export class AppError extends Error {
    constructor(
        readonly code: ErrorCode,
        message?: string,
        readonly details?: Record<string, unknown>,
    ) {
        super(message ?? code);
        this.name = 'AppError';
    }
}

export const ok = <T>(data: T): Ok<T> => ({ ok: true, data });

export const fail = (
    error: ErrorCode,
    message?: string,
    details?: Record<string, unknown>,
): Fail => ({
    ok: false,
    error,
    message,
    details,
});

/** Prefix used when the main process rejects a call; lets the renderer recognize it. */
export const IPC_ERROR_PREFIX = 'PMA_ERROR:';
