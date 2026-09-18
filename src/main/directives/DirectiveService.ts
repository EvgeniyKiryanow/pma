import type { DirectiveInput, DirectiveRecord, DirectiveType } from '../../shared/types/directive';
import type { Transactor } from '../db/types';
import type { ChangeJournal } from '../sync/ChangeJournal';
import type { DirectiveRepository, DirectiveRow } from './DirectiveRepository';

function parseFile(value: string | null): unknown {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function toRecord(row: DirectiveRow): DirectiveRecord {
    return {
        id: row.id,
        userId: row.userId,
        type: row.type,
        title: row.title,
        description: row.description,
        file: parseFile(row.file),
        date: row.date,
        period: { from: row.period_from || '', to: row.period_to || '' },
    };
}

/** Orders (розпорядження), exclusions (виключення) and restorations (відновлення). */
export class DirectiveService {
    constructor(
        private readonly transactor: Transactor,
        private readonly directives: DirectiveRepository,
        private readonly journal: ChangeJournal,
    ) {}

    async listByType(type: DirectiveType): Promise<DirectiveRecord[]> {
        return (await this.directives.listByType(type)).map(toRecord);
    }

    async add(entry: DirectiveInput): Promise<void> {
        await this.transactor.transaction(async () => {
            const id = await this.directives.insert({
                userId: entry.userId,
                type: entry.type,
                title: entry.title,
                description: entry.description || '',
                file: JSON.stringify(entry.file),
                period_from: entry.period?.from || '',
                period_to: entry.period?.to || '',
                date: entry.date,
            });
            await this.journal.recordRow('user_directives', id, 'insert');
        });
    }

    removeById(id: number): Promise<void> {
        return this.removeMatching(() => this.directives.findById(id));
    }

    removeByUserAndDate(userId: number, date: string): Promise<void> {
        return this.removeMatching(() => this.directives.findByUserAndDate(userId, date));
    }

    clearByType(type: DirectiveType): Promise<void> {
        return this.removeMatching(() => this.directives.listByType(type));
    }

    private async removeMatching(find: () => Promise<DirectiveRow[]>): Promise<void> {
        await this.transactor.transaction(async () => {
            for (const row of await find()) {
                await this.directives.delete(row.id);
                await this.journal.record('user_directives', row.id, 'delete', row);
            }
        });
    }
}
