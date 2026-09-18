import { ipcRenderer } from 'electron';

import { APP_CHANNELS, APP_EVENTS } from '../../shared/ipc/channels';
import type { Result } from '../../shared/ipc/result';
import type { AboutInfo, SavedLog, UpdateCheckResult } from '../../shared/types/system';
import { invoke } from '../invoke';

/** Application window (custom title bar) and version. */
export const appApi = {
    getAppVersion: () => invoke<string>(APP_CHANNELS.getVersion),
    checkForUpdates: () => invoke<Result<UpdateCheckResult>>(APP_CHANNELS.checkForUpdates),
    installUpdate: () => invoke<Result<void>>(APP_CHANNELS.installUpdate),
    about: () => invoke<Result<AboutInfo>>(APP_CHANNELS.about),
    saveLog: () => invoke<Result<SavedLog>>(APP_CHANNELS.saveLog),
    closeApp: () => ipcRenderer.send(APP_EVENTS.close),
    hideApp: () => invoke<void>(APP_CHANNELS.hide),
    toggleMaximize: () => ipcRenderer.send(APP_EVENTS.toggleMaximize),
    isMaximized: () => invoke<boolean>(APP_CHANNELS.isMaximized),
};
