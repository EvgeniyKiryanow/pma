import { AppError, type ErrorCode } from '../../shared/ipc/result';
import type { ActionStatus } from '../../shared/types/common';

/**
 * Older channels answer with ad-hoc shapes (`{ success: false, message }`, `false`...) instead
 * of a `Result`. Services still throw `AppError`; controllers translate the expected codes with
 * this helper, so services stay clean and the renderer contract stays the same until those
 * screens move to `handleResult`. Any other error propagates as before.
 */
export async function recoverFrom<T, F>(
    codes: ErrorCode | readonly ErrorCode[],
    work: () => Promise<T>,
    fallback: (error: AppError) => F,
): Promise<T | F> {
    try {
        return await work();
    } catch (err) {
        const expected = typeof codes === 'string' ? [codes] : codes;
        if (err instanceof AppError && expected.includes(err.code)) return fallback(err);
        throw err;
    }
}

/**
 * Answers `{ success: true }` when `work` completes, or `{ success: false, message }` when it
 * throws one of the expected codes — the reply shape of the older mutation channels.
 */
export function toStatus(
    work: () => Promise<unknown>,
    codes: ErrorCode | readonly ErrorCode[] = 'NOT_FOUND',
): Promise<ActionStatus> {
    return recoverFrom(
        codes,
        async () => {
            await work();
            return { success: true };
        },
        (error) => ({ success: false, message: error.message }),
    );
}
