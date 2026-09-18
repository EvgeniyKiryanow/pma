/**
 * Reply of the older channels that report success as a flag. New channels return a `Result`
 * (src/shared/ipc/result.ts) instead.
 */
export type ActionStatus = { success: boolean; message?: string };
