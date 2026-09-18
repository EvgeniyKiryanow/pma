import type { Logger } from '../core/logger';
import type { DbProvider, Transactor } from '../db/types';
import type { ChangeJournal } from '../sync/ChangeJournal';

/**
 * A feature of the main process (personnel, staffing, backups...). Each feature lives in its
 * own folder with the same layout:
 *
 *   XRepository.ts   SQL only, no rules
 *   XService.ts      rules and invariants; dependencies arrive through the constructor
 *   ipc.ts           thin controller: validates IPC input, calls the service, declares access
 *   index.ts         `createXModule(context)` — builds the pieces and returns a FeatureModule
 *
 * Adding a feature: create the folder, then list its module in `app/container.ts`.
 */
export type FeatureModule = {
    readonly name: string;
    /** Registers the feature's IPC channels. Called once, after migrations have run. */
    registerIpc(): void;
};

/** Shared infrastructure every feature module may use. */
export type ModuleContext = {
    /** Current connection (it is reopened after a restore — never cache the handle). */
    db: DbProvider;
    transactor: Transactor;
    /** Journal of syncable changes; write to it inside the same transaction as the change. */
    journal: ChangeJournal;
    createLogger: (scope: string) => Logger;
};

/**
 * Declares a module. Keeps the module's own services on the returned object (the container
 * and dev scripts reach them there) while checking that it satisfies `FeatureModule`.
 */
export function defineModule<T extends FeatureModule>(module: T): T {
    return module;
}
