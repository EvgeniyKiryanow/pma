import type { ChangeLogExportResult, ChangeLogImportResult } from '../../shared/types/sync';
import type { Logger } from '../core/logger';
import type { Transactor } from '../db/types';
import { ChangeApplier } from './ChangeApplier';
import type { ChangeFiles } from './ChangeFiles';
import type { ChangeJournal, ChangeRow } from './ChangeJournal';
import { type ChangeLogFile, InvalidChangeLogPassword } from './ChangeLogFile';
import type { SentFiles } from './SentFiles';

export const MIN_CHANGE_LOG_PASSWORD_LENGTH = 8;

/**
 * File content (characters of base64) one change log carries at most. The log is JSON read
 * whole on the other computer: kept well below what a JavaScript string can hold. More files
 * go into the next change log.
 */
export const FILES_PER_LOG = 150 * 1024 * 1024;

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
        /** Files of people earlier change logs carried: they are not sent again. */
        private readonly sentFiles?: SentFiles,
        private readonly filesPerLog = FILES_PER_LOG,
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

        const attached = this.files
            ? await this.files.attach(changes, { budget: this.filesPerLog, sent: this.sentFiles })
            : { rows: changes, sent: [], incomplete: false };
        await this.file.write(filePath, attached.rows, password);
        // Only entries that were written completely leave the local journal.
        const done = attached.incomplete ? attached.rows.slice(0, -1) : attached.rows;
        await this.transactor.transaction(async () => {
            await this.journal.removeExported(done);
            await this.sentFiles?.remember(attached.sent);
        });
        const remaining = changes.length - done.length;
        this.logger.info(
            `Exported ${attached.rows.length} change(s)${remaining ? `, ${remaining} wait for the next file` : ''}`,
        );
        return { exported: attached.rows.length, ...(remaining ? { remaining } : {}) };
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
