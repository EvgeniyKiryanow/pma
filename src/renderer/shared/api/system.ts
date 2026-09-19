import type {
    AboutInfo,
    SavedLog,
    UpdateCheckResult,
    UpdateProgress,
} from '../../../shared/types/system';
import { bridge, call } from './bridge';
import { unwrap } from './call';

/** The application window (custom title bar), version and interface scale. */
export const systemApi = {
    getVersion: (): Promise<string> => call(bridge().getAppVersion()),
    checkForUpdates: (): Promise<UpdateCheckResult> => unwrap(bridge().checkForUpdates()),
    /** Downloads the update and restarts into it. */
    installUpdate: (): Promise<void> => unwrap(bridge().installUpdate()),
    /** Stops the download started by `installUpdate` (which then fails with CANCELED). */
    cancelUpdate: (): Promise<boolean> => unwrap(bridge().cancelUpdate()),
    /** Progress of the download; returns the unsubscribe function. */
    onUpdateProgress: (callback: (progress: UpdateProgress) => void): (() => void) =>
        bridge().onUpdateProgress(callback),
    about: (): Promise<AboutInfo> => unwrap(bridge().about()),
    /** Saves the log where the person chooses; ApiError CANCELED when the dialog was closed. */
    saveLog: (): Promise<SavedLog> => unwrap(bridge().saveLog()),
    minimize: (): Promise<void> => call(bridge().hideApp()),
    /** Maximized window ⇄ a smaller one (see main/app/window). */
    toggleMaximize: (): void => bridge().toggleMaximize(),
    isMaximized: (): Promise<boolean> => call(bridge().isMaximized()),
    close: (): void => bridge().closeApp(),
    /** Page zoom; ignored where there is no bridge (tests, a plain browser). */
    setZoomFactor: (factor: number): void => window.electronAPI?.ui?.setZoomFactor(factor),
};
