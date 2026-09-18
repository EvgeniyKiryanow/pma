import { ipcRenderer } from 'electron';

import { APP_CHANNELS, APP_EVENTS } from '../../shared/ipc/channels';
import type { UpdateCheckResult } from '../../shared/types/system';
import { invoke } from '../invoke';

/** Application window (custom title bar) and version. */
export const appApi = {
    getAppVersion: () => invoke<string>(APP_CHANNELS.getVersion),
    checkForUpdates: () => invoke<UpdateCheckResult>(APP_CHANNELS.checkForUpdates),
    closeApp: () => ipcRenderer.send(APP_EVENTS.close),
    hideApp: () => invoke<void>(APP_CHANNELS.hide),
    toggleFullScreen: () => ipcRenderer.send(APP_EVENTS.toggleFullScreen),
};
