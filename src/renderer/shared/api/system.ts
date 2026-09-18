import type { UpdateCheckResult } from '../../../shared/types/system';
import { bridge, call } from './bridge';

/** The application window (custom title bar), version and interface scale. */
export const systemApi = {
    getVersion: (): Promise<string> => call(bridge().getAppVersion()),
    checkForUpdates: (): Promise<UpdateCheckResult> => call(bridge().checkForUpdates()),
    minimize: (): Promise<void> => call(bridge().hideApp()),
    toggleFullScreen: (): void => bridge().toggleFullScreen(),
    close: (): void => bridge().closeApp(),
    /** Page zoom; ignored where there is no bridge (tests, a plain browser). */
    setZoomFactor: (factor: number): void => window.electronAPI?.ui?.setZoomFactor(factor),
};
