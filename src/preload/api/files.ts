import { FILE_CHANNELS, SETTINGS_CHANNELS } from '../../shared/ipc/channels';
import type { Result } from '../../shared/ipc/result';
import type {
    PickedFile,
    PickFilesRequest,
    SaveFileRequest,
    SaveFileResult,
} from '../../shared/types/files';
import type { SecuritySettings, UnitInfo } from '../../shared/types/settings';
import { invoke } from '../invoke';

/** File dialogs and clipboard through the main process (no traces in Windows). */
export const filesApi = {
    pick: (request: PickFilesRequest) => invoke<Result<PickedFile[]>>(FILE_CHANNELS.pick, request),
    save: (request: SaveFileRequest) => invoke<Result<SaveFileResult>>(FILE_CHANNELS.save, request),
    copyText: (text: string) => invoke<Result<void>>(FILE_CHANNELS.copyText, text),
};

/** Settings stored with the data. */
export const settingsApi = {
    getSecurity: () => invoke<Result<SecuritySettings>>(SETTINGS_CHANNELS.getSecurity),
    updateSecurity: (patch: Partial<SecuritySettings>) =>
        invoke<Result<SecuritySettings>>(SETTINGS_CHANNELS.updateSecurity, patch),
    getUnitInfo: () => invoke<Result<UnitInfo | null>>(SETTINGS_CHANNELS.getUnitInfo),
    updateUnitInfo: (info: UnitInfo | null) =>
        invoke<Result<UnitInfo | null>>(SETTINGS_CHANNELS.updateUnitInfo, info),
};
