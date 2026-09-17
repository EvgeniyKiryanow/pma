import type { Db } from '../types';

/**
 * A migration is immutable once released: never edit a shipped migration, add a new one.
 * `up` runs inside a transaction with foreign keys disabled (SQLite's recommended procedure
 * for schema changes). Tables listed in `verifyForeignKeys` are checked before commit —
 * only the tables the migration creates/rebuilds, so legacy rows elsewhere cannot block startup.
 */
export type Migration = {
    version: number;
    name: string;
    verifyForeignKeys?: string[];
    up: (db: Db) => Promise<void>;
};
