/**
 * `current`: this is the newest version. `available`: a newer one was published;
 * `canInstall` is false where it must be downloaded by hand (macOS, development).
 */
/** «Про програму». */
export type AboutInfo = {
    version: string;
    /** When this build was made (ISO), if known. */
    builtAt: string | null;
    system: string;
    engine: string;
    /** Folder with the data of this computer. */
    dataFolder: string;
    developer: { name: string; email: string | null };
};

export type SavedLog = { fileName: string };

export type UpdateCheckResult =
    | { status: 'current'; version: string }
    | { status: 'available'; version: string; canInstall: boolean };
