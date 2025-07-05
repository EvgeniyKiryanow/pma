export type MediaType = 'text' | 'pdf' | 'audio' | 'image' | 'video' | 'history';

export type CommentOrHistoryEntry = {
    files: any[];
    id: number; // unique id for each entry
    date: string; // ISO date string when the entry was made
    author?: string; // who wrote/added the entry (optional)
    type: MediaType;
    content: string; // could be plain text or a file path/URL for pdf/audio/image/video
    description?: string; // optional short description or title
};

export type RelativeContact = {
    name: string;
    relationship: string; // e.g. "mother", "brother", "wife"
    phone?: string;
    email?: string;
    notes?: string;
};
export type User = {
    id: number;
    photo?: string; // photo URL or local path
    fullName: string; // ФИО
    phoneNumber: any;
    email?: string;
    dateOfBirth: string; // ISO date string
    position: string; // посада (job/role)
    rank: string; // звание
    rights: string; // права (permissions/licenses/clearances)
    conscriptionInfo: string; // где когда и кем призивался (where, when, by whom conscripted)
    notes: string;
    education?: string; 
    awards?: string; 
    relatives: RelativeContact[];
    comments: CommentOrHistoryEntry[];
    history: CommentOrHistoryEntry[];
};
