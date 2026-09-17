import log from 'electron-log/main';

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
