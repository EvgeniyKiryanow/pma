import type {
    PickedFile,
    PickFilesRequest,
    PrintableDocument,
    SaveFileRequest,
    SaveFileResult,
} from '../../../shared/types/files';
import type { SecuritySettings, UnitInfo } from '../../../shared/types/settings';
import { bridge } from './bridge';
import { unwrap } from './call';

/**
 * Files in and out of the app. Dialogs run in the main process with "do not add to recent",
 * so Windows keeps no record of what was opened or saved. Throws ApiError.
 */
export const filesApi = {
    /** Empty array when the dialog was closed. */
    pick: (request: PickFilesRequest): Promise<PickedFile[]> =>
        unwrap(bridge().files.pick(request)),
    /** `saved: false` when the dialog was closed. */
    save: (request: SaveFileRequest): Promise<SaveFileResult> =>
        unwrap(bridge().files.save(request)),
    /** Copies text; it is cleared from the clipboard when the session ends. */
    copyText: (text: string): Promise<void> => unwrap(bridge().files.copyText(text)),
    /** Windows print dialog for a report; false when it was cancelled. */
    print: async (document: PrintableDocument): Promise<boolean> =>
        (await unwrap(bridge().files.print(document))).printed,
    /** A report as PDF, saved where the person chooses. */
    savePdf: (document: PrintableDocument): Promise<SaveFileResult> =>
        unwrap(bridge().files.savePdf(document)),
};

/** Settings stored with the data (they travel with backups). */
export const settingsApi = {
    getSecurity: (): Promise<SecuritySettings> => unwrap(bridge().settings.getSecurity()),
    updateSecurity: (patch: Partial<SecuritySettings>): Promise<SecuritySettings> =>
        unwrap(bridge().settings.updateSecurity(patch)),
    getUnitInfo: (): Promise<UnitInfo | null> => unwrap(bridge().settings.getUnitInfo()),
    updateUnitInfo: (info: UnitInfo | null): Promise<UnitInfo | null> =>
        unwrap(bridge().settings.updateUnitInfo(info)),
};
