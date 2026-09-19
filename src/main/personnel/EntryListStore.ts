import type { ChangeJournal } from '../sync/ChangeJournal';
import type { EntryListField, PersonnelRepository } from './PersonnelRepository';
import { safeJsonArray } from './userFields';

export type EntryOwner<T> = { userId: number; shpkNumber: string | null; entries: T[] };

/**
 * History and comments are JSON arrays inside the person's row (a separate table is on the
 * roadmap). This class is the one place that reads and writes such a list, and it journals
 * every write, so both features share the same, safe mechanics.
 */
export class EntryListStore<T extends { id: number }> {
    constructor(
        private readonly people: PersonnelRepository,
        private readonly journal: ChangeJournal,
        private readonly field: EntryListField,
    ) {}

    /** Entries of one person; `null` when there is no such person. */
    async read(userId: number): Promise<T[] | null> {
        const row = await this.people.readEntryList(userId, this.field);
        return row ? (safeJsonArray(row.value) as T[]) : null;
    }

    /** Replaces the list and records the change. Call inside a transaction. */
    async write(userId: number, entries: T[]): Promise<void> {
        await this.people.writeEntryList(userId, this.field, JSON.stringify(entries));
        await this.journal.recordRow('users', userId, 'update');
    }

    /** Lists that may hold the entry with this id (their JSON mentions the number). */
    async mayContain(entryId: number): Promise<EntryOwner<T>[]> {
        return this.owners(await this.people.listEntryListsContaining(this.field, String(entryId)));
    }

    async all(): Promise<EntryOwner<T>[]> {
        return this.owners(await this.people.listEntryLists(this.field));
    }

    private owners(
        rows: { id: number; shpkNumber: string | null; value: string | null }[],
    ): EntryOwner<T>[] {
        return rows.map((row) => ({
            userId: row.id,
            shpkNumber: row.shpkNumber,
            entries: safeJsonArray(row.value) as T[],
        }));
    }
}
