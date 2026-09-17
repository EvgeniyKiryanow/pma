import { database } from './connection';
import type { Db } from './types';

/**
 * Compatibility layer for the IPC handlers written before `DatabaseManager`.
 * New code should receive a `DbProvider` through its constructor instead.
 */
export async function getDb(): Promise<Db> {
    return database.get();
}

export async function getDbPath(): Promise<string> {
    return database.path;
}
