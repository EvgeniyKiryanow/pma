import type { Database } from 'sqlite';
import type sqlite3 from 'sqlite3';

export type Db = Database<sqlite3.Database, sqlite3.Statement>;

/** Lazily resolves the current connection (it may be reopened after a restore). */
export type DbProvider = () => Promise<Db>;
