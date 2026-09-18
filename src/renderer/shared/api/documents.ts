import type {
    DocumentCategory,
    NewDocumentsInput,
    PersonDocument,
    RecentFile,
} from '../../../shared/types/documents';
import type { JournalEntry, JournalEntryInput } from '../../../shared/types/journal';
import { bridge } from './bridge';
import { unwrap } from './call';

/** «Документи» of a person. Every function throws `ApiError` on failure. */
export const documentsApi = {
    categories: (userId?: number): Promise<DocumentCategory[]> =>
        unwrap(bridge().documents.categories(userId)),
    addCategory: (name: string): Promise<DocumentCategory> =>
        unwrap(bridge().documents.addCategory(name)),
    renameCategory: (uuid: string, name: string): Promise<void> =>
        unwrap(bridge().documents.renameCategory(uuid, name)),
    /** CONFLICT (details.count) while the category holds documents. */
    removeCategory: (uuid: string): Promise<void> =>
        unwrap(bridge().documents.removeCategory(uuid)),
    list: (userId: number): Promise<PersonDocument[]> => unwrap(bridge().documents.list(userId)),
    add: (input: NewDocumentsInput): Promise<PersonDocument[]> =>
        unwrap(bridge().documents.add(input)),
    update: (
        uuid: string,
        patch: { name?: string; categoryUuid?: string | null; note?: string },
    ): Promise<PersonDocument> => unwrap(bridge().documents.update(uuid, patch)),
    remove: (uuid: string): Promise<void> => unwrap(bridge().documents.remove(uuid)),
    /** The content as a data URL. */
    load: (uuid: string): Promise<string> => unwrap(bridge().documents.load(uuid)),
    /** Files added lately anywhere in the program. */
    recent: (limit?: number): Promise<RecentFile[]> => unwrap(bridge().documents.recent(limit)),
};

/** The working journal. */
export const journalApi = {
    list: (): Promise<JournalEntry[]> => unwrap(bridge().journal.list()),
    save: (entry: JournalEntryInput): Promise<JournalEntry> => unwrap(bridge().journal.save(entry)),
    setDone: (uuid: string, done: boolean): Promise<JournalEntry> =>
        unwrap(bridge().journal.setDone(uuid, done)),
    setPinned: (uuid: string, pinned: boolean): Promise<JournalEntry> =>
        unwrap(bridge().journal.setPinned(uuid, pinned)),
    remove: (uuid: string): Promise<void> => unwrap(bridge().journal.remove(uuid)),
    loadFile: (uuid: string, fileName: string): Promise<string> =>
        unwrap(bridge().journal.loadFile(uuid, fileName)),
};
