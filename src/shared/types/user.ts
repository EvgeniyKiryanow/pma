// src/shared/types/user.ts

export type MediaType =
    | 'text'
    | 'pdf'
    | 'audio'
    | 'image'
    | 'video'
    | 'history'
    | 'statusChange'
    | 'exclude'
    | 'restore'
    | 'order';

export type CommentOrHistoryEntry = {
    files: any[];
    id: number;
    date: string;
    author?: string;
    type: MediaType;
    content: string;
    description?: string;
    period?: {
        from: string;
        to: string;
    };
    /** Status changes: the status set by this entry (older entries have it only in the text). */
    status?: string;
    previousStatus?: string;
};

export type RelativeContact = {
    name: string;
    relationship: string;
    phone?: string;
    email?: string;
    notes?: string;
};

export type Gender = 'male' | 'female';

/** One line of Impulse «Освіта і курси» (Додаток 2). */
export type EducationEntry = {
    /** Stable id of the line (a random UUID), kept across computers. */
    id: string;
    /** «Цивільна» / «Військова». */
    type?: string;
    /** Рівень цивільної або військової освіти (Impulse dictionaries). */
    level?: string;
    form?: string;
    /** Курси професійної військової освіти (L1A…L5). */
    courses?: string;
    institution?: string;
    institutionType?: string;
    specialty?: string;
    startYear?: string;
    endYear?: string;
    comment?: string;
};

/** Where an award stands: from the submission to the handing over. */
export type AwardStatus = 'draft' | 'submitted' | 'awarded' | 'presented' | 'rejected';

/** One award of a person (the «Нагороди» category of the card). */
export type AwardRecord = {
    /** Stable id of the record (a random UUID), kept across computers. */
    id: string;
    /** Catalogue id (shared/awards/catalog.ts) or 'other' for an award written by hand. */
    awardId: string;
    /** Ступінь: 'I'…'V' for awards with degrees. */
    degree?: string;
    /** The name, for 'other' (and awards of other bodies). */
    title?: string;
    /** Від кого: who awards (Президент України, Міністр оборони, командир…). */
    awardedBy?: string;
    status: AwardStatus;
    /** Дата подачі (ДД.ММ.РРРР). */
    submittedAt?: string;
    /** Дата наказу / указу. */
    orderDate?: string;
    /** Номер наказу / указу про нагородження. */
    orderNumber?: string;
    /** Дата вручення. */
    presentedAt?: string;
    posthumous?: boolean;
    notes?: string;
};

export type User = {
    shtatNumber: string | boolean; // keep as provided
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
    /** Прикомандирований: serves with the unit, belongs to another (stored as 0/1). */
    isAttached?: boolean | number;
    /** Where an attached person came from. */
    attachedFrom?: string;
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

    // ✅ (was missing) soldierStatus
    soldierStatus?: string;

    // Особова картка as in Impulse (migration 10). The free-text fields above (passportData,
    // militaryTicketInfo, registeredAddress…) stay as written; these hold the same data in the
    // columns of the Impulse form, so exports take them as they are.
    passportType?: string;
    passportSeries?: string;
    passportNumber?: string;
    passportIssuer?: string;
    passportIssueDate?: string;
    foreignPassportNumber?: string;
    foreignPassportIssuer?: string;
    foreignPassportIssueDate?: string;
    militaryTicketSeries?: string;
    militaryTicketNumber?: string;
    militaryTicketIssuer?: string;
    militaryTicketIssueDate?: string;
    ubdSeries?: string;
    ubdNumber?: string;
    ubdIssuer?: string;
    ubdIssueDate?: string;
    driverLicenseCategories?: string;
    driverLicenseSeries?: string;
    driverLicenseNumber?: string;
    driverLicenseIssuer?: string;
    driverLicenseIssueDate?: string;
    driverLicenseValidUntil?: string;
    drivingExperience?: string;
    tractorLicenseCategories?: string;
    tractorLicenseSeries?: string;
    tractorLicenseNumber?: string;
    tractorLicenseIssuer?: string;
    tractorLicenseIssueDate?: string;
    tractorLicenseValidUntil?: string;
    tractorExperience?: string;
    iban?: string;
    bankCard?: string;
    bankName?: string;
    regRegion?: string;
    regDistrict?: string;
    regSettlement?: string;
    regCityDistrict?: string;
    regStreetType?: string;
    regStreet?: string;
    regHouse?: string;
    regFlat?: string;
    liveRegion?: string;
    liveDistrict?: string;
    liveSettlement?: string;
    liveCityDistrict?: string;
    liveStreetType?: string;
    liveStreet?: string;
    liveHouse?: string;
    liveFlat?: string;
    extraPhone?: string;
    citizenship?: string;
    birthCountry?: string;
    nationality?: string;
    tags?: string;
    rankOrderNumber?: string;
    rankOrderIssuer?: string;
    appointmentOrderDate?: string;
    appointmentOrderNumber?: string;
    appointmentOrderIssuer?: string;
    drillOrderDate?: string;
    drillOrderNumber?: string;
    drillOrderIssuer?: string;
    bzvpFrom?: string;
    bzvpTo?: string;
    bzvpPlace?: string;
    bzvpCommander?: string;
    bzvpComment?: string;
    academicTitle?: string;
    academicTitleAssignedBy?: string;
    academicTitleDate?: string;
    scientificWorks?: string;
    electedBody?: string;
    electedDate?: string;
    electedUntil?: string;
    electedPosition?: string;
    oathDate?: string;
    conscriptionDate?: string;
    enlistmentOrderDate?: string;
    enlistmentOrderNumber?: string;
    serviceLengthDate?: string;
    serviceLength?: string;
    preferentialServiceLengthDate?: string;
    preferentialServiceLength?: string;
    /** Освіта і курси (Impulse Додаток 2), one entry per school or course. */
    educationList?: EducationEntry[];
    /** Нагороди. */
    awardRecords?: AwardRecord[];
};

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
