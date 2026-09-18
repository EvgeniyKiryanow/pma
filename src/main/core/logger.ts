import log from 'electron-log/main';
import path from 'path';

import { shred } from './fsUtils';

/**
 * File + console logger. Files live in `<userData>/logs/main.log` and rotate at 5 MB,
 * which is what gets sent back when a unit reports a problem.
 * Never log personal data (names, documents, passwords) — log ids and counts.
 */
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'warn';

export type Logger = {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
};

export function createLogger(scope: string): Logger {
    return log.scope(scope);
}

/**
 * Overwrites and deletes the log files — part of destroying all data. The log holds no
 * personal data by design, but errors reported from the window are copied into it verbatim
 * and could quote a name or a file name. Logging continues in a fresh file afterwards.
 */
export async function destroyLogFiles(): Promise<number> {
    const file = log.transports.file.getFile();
    const { files } = await shred(path.dirname(file.path));
    (file as unknown as { reset?: () => void }).reset?.();
    return files;
}
