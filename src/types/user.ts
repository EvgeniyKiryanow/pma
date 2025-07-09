export type MediaType = 'text' | 'pdf' | 'audio' | 'image' | 'video' | 'history';

export type CommentOrHistoryEntry = {
    files: any[];
    id: number; 
    date: string; 
    author?: string; 
    type: MediaType;
    content: string; 
    description?: string; 
};

export type RelativeContact = {
    name: string;
    relationship: string; 
    phone?: string;
    email?: string;
    notes?: string;
};
export type User = {
    id: number;
    photo?: string;
    fullName: string;
    phoneNumber: string;
    email?: string;
    dateOfBirth: string;
    position: string;
    rank: string;
    rights: string;
    conscriptionInfo: string;
    notes: string;
    education?: string;
    awards?: string;
    relatives: RelativeContact[];
    comments: CommentOrHistoryEntry[];
    history: CommentOrHistoryEntry[];

    // ✅ New Fields
    callsign?: string;
    passportData?: string;
    participantNumber?: string;
    identificationNumber?: string;
    fitnessCategory?: string;
    unitNumber?: string;
    hasCriminalRecord?: boolean;
    criminalRecordDetails?: string;
    militaryTicketInfo?: string;
    militaryServiceHistory?: string;
    civilProfession?: string;
    educationDetails?: string;
    residenceAddress?: string;
    registeredAddress?: string;
    healthConditions?: string;
    maritalStatus?: string;
    familyInfo?: string;
    religion?: string;
    recruitingOffice?: string;
    driverLicenses?: string;
    bloodType?: string;
};

