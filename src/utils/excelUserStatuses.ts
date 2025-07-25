export enum StatusExcel {
    NO_STATUS = 'Без статусу',

    // === З НИХ ===
    POSITIONS_INFANTRY = 'Позиція піхоти',
    POSITIONS_CREW = 'Позиція екіпажу',
    POSITIONS_CALCULATION = 'Позиція розрахунку',
    POSITIONS_UAV = 'Позиція БПЛА',

    // === РОТАЦІЯ ТА РЕЗЕРВ ===
    ROTATION_INFANTRY = 'Ротація піхота',
    ROTATION_CREW = 'Ротація екіпаж',
    ROTATION_CALCULATION = 'Ротація розрахунок',
    ROTATION_UAV = 'Ротація БПЛА',

    // === ЗАБЕЗПЕЧЕННЯ ===
    SUPPLY_BD = 'Забезпечення БД',
    SUPPLY_ENGINEERING = 'Забезпечення інженерне',
    SUPPLY_LIFE_SUPPORT = 'Забезпечення життєдіяльності',

    // === УПРАВЛІННЯ ===
    MANAGEMENT = 'Управління',
    KSP = 'КСП',

    // === НЕ БГ ===
    NON_COMBAT_ATTACHED_UNITS = 'Приданий в інший підрозділ',
    NON_COMBAT_TRAINING_NEWCOMERS = 'Навчання, новоприбулий',
    NON_COMBAT_HOSPITAL_REFERRAL = 'Має направлення на лікування',
    NON_COMBAT_EXEMPTED = 'Звільнений від фізичного навантаження',
    NON_COMBAT_TREATMENT_ON_SITE = 'Лікування на локації',
    NON_COMBAT_LIMITED_FITNESS = 'Обмежено придатний',
    NON_COMBAT_AWAITING_DECISION = 'Очікує кадрового рішення',
    NON_COMBAT_REFUSERS = 'Відмовник',

    // === ВІДСУТНІ ===
    ABSENT_MEDICAL_LEAVE = 'Відпустка лікування',
    ABSENT_ANNUAL_LEAVE = 'Відпустка щорічна',
    ABSENT_FAMILY_LEAVE = 'Відпустка за сімейними обставинами',
    ABSENT_TRAINING = 'Навчання',
    ABSENT_BUSINESS_TRIP = 'Відрядження',
    ABSENT_ARREST = 'Арешт',
    ABSENT_SZO = 'СЗЧ',
    ABSENT_HOSPITAL = 'Шпиталь',
    ABSENT_VLK = 'ВЛК',
    ABSENT_300 = '300',
    ABSENT_500 = '500',
    ABSENT_200 = '200',
}
