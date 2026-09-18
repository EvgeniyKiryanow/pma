/** A category of the documents of a person («Паспорт та ІПН», «Накази та витяги»…). */
export type DocumentCategory = { uuid: string; name: string; sort: number; count: number };

/** A document of a person, stored encrypted in the data folder. */
export type PersonDocument = {
    uuid: string;
    userId: number;
    categoryUuid: string | null;
    name: string;
    type: string;
    size: number;
    note: string;
    createdAt: string;
};

/** New files for a person: each becomes a document of the category. */
export type NewDocumentsInput = {
    userId: number;
    categoryUuid: string | null;
    files: { name: string; type?: string; dataUrl: string }[];
    note?: string;
};

export type RecentFileSource = 'document' | 'history' | 'award' | 'report' | 'journal';

/** A file added lately anywhere in the program (the desktop «Останні документи»). */
export type RecentFile = {
    key: string;
    source: RecentFileSource;
    name: string;
    /** ISO date it was added. */
    date: string;
    userId?: number;
    userName?: string;
    /** Where it belongs: the category, the history entry, the award, the journal entry… */
    context?: string;
    /** What the window needs to open it. */
    ref: {
        documentUuid?: string;
        entryId?: number;
        recordId?: string;
        filePath?: string;
        journalUuid?: string;
    };
};
