import type { UpdateCheckResult } from '../../../shared/types/system';
import { bridge, call } from './bridge';
import { unwrap } from './call';

/** The application window (custom title bar), version and interface scale. */
export const systemApi = {
    getVersion: (): Promise<string> => call(bridge().getAppVersion()),
    checkForUpdates: (): Promise<UpdateCheckResult> => unwrap(bridge().checkForUpdates()),
    /** Downloads the update and restarts into it. */
    installUpdate: (): Promise<void> => unwrap(bridge().installUpdate()),
    minimize: (): Promise<void> => call(bridge().hideApp()),
    /** Maximized window ⇄ a smaller one (see main/app/window). */
    toggleMaximize: (): void => bridge().toggleMaximize(),
    isMaximized: (): Promise<boolean> => call(bridge().isMaximized()),
    close: (): void => bridge().closeApp(),
    /** Page zoom; ignored where there is no bridge (tests, a plain browser). */
    setZoomFactor: (factor: number): void => window.electronAPI?.ui?.setZoomFactor(factor),
};
