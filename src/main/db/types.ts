import type { Db } from './driver';

export type { Db, RunResult } from './driver';

/** Lazily resolves the current connection (it may be reopened after a restore). */
export type DbProvider = () => Promise<Db>;

/**
 * Runs work atomically on the shared connection. Services depend on this instead of the whole
 * `DatabaseManager`; repositories called inside `work` see the same transaction because they
 * resolve the same connection through their `DbProvider`.
 */
export type Transactor = {
    transaction<T>(work: (db: Db) => Promise<T>): Promise<T>;
};
