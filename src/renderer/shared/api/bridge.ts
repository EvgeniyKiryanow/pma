import type { ErrorCode } from '../../../shared/ipc/result';
import type { ActionStatus } from '../../../shared/types/common';
import { ApiError, toApiError } from './call';

/**
 * The preload bridge. Only files in shared/api use it; screens and stores call the typed
 * clients next to this file, so every reply is checked and every failure is an `ApiError`.
 */
export const bridge = () => window.electronAPI;

/** Awaits an IPC call and normalizes a rejection (access denied, validation...) to ApiError. */
export async function call<T>(promise: Promise<T>): Promise<T> {
    try {
        return await promise;
    } catch (error) {
        throw toApiError(error);
    }
}

/** Older channels report failure as `{ success: false }`; turn that into an ApiError. */
export async function expectSuccess<T extends ActionStatus | { success: boolean }>(
    promise: Promise<T>,
    code: ErrorCode,
): Promise<T> {
    const reply = await call(promise);
    // The server message of these channels is English/technical; the UI shows the
    // translated text of `code` instead.
    if (!reply?.success) throw new ApiError(code);
    return reply;
}

/** A reply that is either the value or the older `{ success: false }` failure shape. */
export function isFailure(value: unknown): value is { success: false; message?: string } {
    return Boolean(
        value && typeof value === 'object' && (value as { success?: unknown }).success === false,
    );
}
