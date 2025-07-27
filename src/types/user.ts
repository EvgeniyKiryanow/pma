export type MediaType = 'text' | 'pdf' | 'audio' | 'image' | 'video' | 'history' | 'statusChange';

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
    shtatNumber: string | boolean;
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

    // ✅ New hierarchy fields
    unitMain?: string;
    unitLevel1?: string;
    unitLevel2?: string;
    platoon?: string;
    squad?: string;

    // ✅ Military specialization
    vosCode?: string;
    shpkCode?: string;
    shpkNumber?: string;
    category?: string;
    kshp?: string;

    // ✅ Rank & appointment details
    rankAssignedBy?: string;
    rankAssignmentDate?: string;
    appointmentOrder?: string;
    previousStatus?: string;

    // ✅ Personal details
    placeOfBirth?: string;
    taxId?: string;
    serviceType?: string;
    recruitmentOfficeDetails?: string;
    ubdStatus?: string;
    childrenInfo?: string;

    // ✅ Absence / status fields
    bzvpStatus?: string;
    rvbzPresence?: string;
    absenceReason?: string;
    absenceFromDate?: string;
    absenceToDate?: string;

    // ✅ Subordination & gender
    subordination?: string;
    gender?: Gender;

    // ✅ Excel-specific
    personalPrisonFileExists?: string; // Наявність особової справи
    tDotData?: string; // т. (тарифна категорія)
    positionNominative?: string;
    positionGenitive?: string;
    positionDative?: string;
    positionInstrumental?: string;
    soldierStatus?: string;
};

export type Gender = 'male' | 'female';

export type FullName = {
    lastName: string;
    firstName: string;
    middleName?: string;
    gender: Gender;
};

export type DeclinedName = {
    nominative: string;
    genitive: string;
    dative: string;
    accusative: string;
    instrumental: string;
    locative: string;
};
