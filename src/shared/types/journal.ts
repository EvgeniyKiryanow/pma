export type JournalPriority = 'low' | 'normal' | 'high';

export const JOURNAL_PRIORITIES: readonly JournalPriority[] = ['high', 'normal', 'low'];

/** A file of a journal entry. `dataUrl` only travels with a new file on its way to be saved. */
export type JournalFile = { name: string; type?: string; size?: number; dataUrl?: string };

/** A note or task of the working journal (планувальник). */
export type JournalEntry = {
    uuid: string;
    title: string;
    body: string;
    /** "YYYY-MM-DD" (local date), or null for an entry without a date. */
    dueDate: string | null;
    /** "HH:MM" or null. */
    dueTime: string | null;
    priority: JournalPriority;
    category: string;
    done: boolean;
    doneAt: string | null;
    pinned: boolean;
    files: JournalFile[];
    /** A person the entry is about (optional). */
    userId: number | null;
    createdAt: string;
    updatedAt: string;
};

export type JournalEntryInput = Omit<
    JournalEntry,
    'uuid' | 'doneAt' | 'createdAt' | 'updatedAt'
> & { uuid?: string };
