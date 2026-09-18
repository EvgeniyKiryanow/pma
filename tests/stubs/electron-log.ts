/** electron-log stub: tests must not write log files. */
const noop = (): void => undefined;

const scope = () => ({ debug: noop, info: noop, warn: noop, error: noop });

export default {
    transports: { file: { level: 'info', maxSize: 0 }, console: { level: 'warn' } },
    scope,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
};
