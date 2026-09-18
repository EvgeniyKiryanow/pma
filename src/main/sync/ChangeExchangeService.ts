import type { ChangeLogExportResult, ChangeLogImportResult } from '../../shared/types/sync';
import type { Logger } from '../core/logger';
import type { Transactor } from '../db/types';
import { ChangeApplier } from './ChangeApplier';
import type { ChangeFiles } from './ChangeFiles';
import type { ChangeJournal, ChangeRow } from './ChangeJournal';
import { type ChangeLogFile, InvalidChangeLogPassword } from './ChangeLogFile';

export const MIN_CHANGE_LOG_PASSWORD_LENGTH = 8;

/** Asks the user where to write or read the file; `null` means canceled. */
export type PathPicker = () => Promise<string | null>;

/**
 * Offline exchange of changes between computers through encrypted `.pmc` files.
 * The file dialogs are passed in, so the service has no dependency on windows.
 */
export class ChangeExchangeService {
    constructor(
        private readonly transactor: Transactor,
        private readonly journal: ChangeJournal,
        private readonly file: ChangeLogFile,
        private readonly logger: Logger,
        /** Files that travel with the changes (documents, journal, awards, history). */
        private readonly files?: ChangeFiles,
    ) {}

    async exportChanges(
        password: string,
        chooseTarget: PathPicker,
    ): Promise<ChangeLogExportResult> {
        if (!password || password.length < MIN_CHANGE_LOG_PASSWORD_LENGTH) {
            return { exported: 0, error: 'short-password' };
        }
        const changes = await this.journal.pendingLocal();
        if (!changes.length) return { exported: 0 };

        const filePath = await chooseTarget();
        if (!filePath) return { exported: 0, canceled: true };

        const withFiles = this.files ? await this.files.attach(changes) : changes;
        await this.file.write(filePath, withFiles, password);
        // Only entries that were actually written are removed from the local journal.
        await this.journal.removeLocalUpTo(changes[changes.length - 1].id);
        this.logger.info(`Exported ${changes.length} change(s)`);
        return { exported: changes.length };
    }

    async importChanges(
        password: string,
        chooseSource: PathPicker,
    ): Promise<ChangeLogImportResult> {
        const filePath = await chooseSource();
        if (!filePath) return { imported: 0, canceled: true };

        let changes: unknown;
        try {
            changes = await this.file.read(filePath, password);
        } catch (err) {
            const invalid = err instanceof InvalidChangeLogPassword;
            return { imported: 0, error: invalid ? 'invalid-password' : 'unreadable' };
        }
        if (!Array.isArray(changes)) return { imported: 0, error: 'unreadable' };

        const stats = await this.apply(changes as ChangeRow[]);
        this.logger.info(`Change log import: ${JSON.stringify(stats)}`);
        return stats;
    }

    /** One transaction; each change in its own savepoint, so a bad change is skipped alone. */
    private apply(changes: ChangeRow[]) {
        const stats = { imported: 0, skipped: 0, failed: 0 };
        return this.transactor.transaction(async (db) => {
            const applier = new ChangeApplier(db);
            for (const [index, change] of changes.entries()) {
                await db.exec(`SAVEPOINT change_${index}`);
                try {
                    const outcome = await applier.apply(change);
                    if (outcome === 'imported') await this.files?.restore(db, change);
                    stats[outcome] += 1;
                    await db.exec(`RELEASE change_${index}`);
                } catch (err) {
                    await db.exec(`ROLLBACK TO change_${index}`);
                    await db.exec(`RELEASE change_${index}`);
                    stats.failed += 1;
                    this.logger.warn(
                        `Change ${change?.operation} on ${change?.table_name} failed`,
                        err,
                    );
                }
            }
            return stats;
        });
    }
}
