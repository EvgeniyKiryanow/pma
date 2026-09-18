/**
 * `current`: this is the newest version. `available`: a newer one was published;
 * `canInstall` is false where it must be downloaded by hand (macOS, development).
 */
export type UpdateCheckResult =
    | { status: 'current'; version: string }
    | { status: 'available'; version: string; canInstall: boolean };
