/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
export enum StatusExcel {
    NO_STATUS = 'Без статуса',
    // === З НИХ ===
    POSITIONS_INFANTRY = 'ПОЗИЦІЇ ПІХОТИ',
    POSITIONS_CREW = 'ПОЗИЦІЇ ЕКІПАЖ',
    POSITIONS_CALCULATION = 'ПОЗИЦІЇ РОЗРАХУНОК',
    POSITIONS_UAV = 'ПОЗИЦІЇ БПЛА',
    // === РОТАЦІЯ ТА РЕЗЕРВ ===
    ROTATION_INFANTRY = 'РОТАЦІЯ ПІХОТА',
    ROTATION_CREW = 'РОТАЦІЯ ЕКІПАЖ',
    ROTATION_CALCULATION = 'РОТАЦІЯ РОЗРАХУНОК',
    ROTATION_UAV = 'РОТАЦІЯ БПЛА',
    // === ЗАБЕСПЕЧЕННЯ ===
    SUPPLY_BD = 'ЗАБЕСПЕЧЕННЯ, БД',
    SUPPLY_ENGINEERING = 'ЗАБЕСПЕЧЕННЯ, ІНЖЕНЕРНЕ',
    SUPPLY_LIFE_SUPPORT = 'ЗАБЕСПЕЧЕННЯ, ЖИТТЄДІЯЛЬНОСТІ',
    // === УПРАВЛІННЯ ===
    MANAGEMENT = 'УПРАВЛІННЯ',
    KSP = 'КСП',
    // === не БГ ===
    NON_COMBAT_ATTACHED_UNITS = 'придані в інші підзозділи',
    NON_COMBAT_TRAINING_NEWCOMERS = 'навчання,новоприбувші',
    NON_COMBAT_HOSPITAL_REFERRAL = 'мають направлення на лік.',
    NON_COMBAT_EXEMPTED = 'звільнено від фізичного навантаження',
    NON_COMBAT_TREATMENT_ON_SITE = 'лікування на локації',
    NON_COMBAT_LIMITED_FITNESS = 'обмежено придатні',
    NON_COMBAT_AWAITING_DECISION = 'очікують кадрового рішення',
    NON_COMBAT_REFUSERS = 'відмовники',
    // === ВІДСУТНІ ===
    ABSENT_MEDICAL_LEAVE = 'ВІДПУСТКА ЛІКУВАННЯ',
    ABSENT_ANNUAL_LEAVE = 'ВІДПУСТКА ЩОРІЧНА',
    ABSENT_FAMILY_LEAVE = 'ВІДПУСТКА ЗА СІМЕЙНИМИ',
    ABSENT_TRAINING = 'НАВЧАННЯ',
    ABSENT_BUSINESS_TRIP = 'ВІДРЯДЖЕННЯ',
    ABSENT_ARREST = 'АРЕШТ',
    ABSENT_SZO = 'СЗЧ',
    ABSENT_HOSPITAL = 'ШПИТАЛЬ',
    ABSENT_VLK = 'ВЛК',
    ABSENT_300 = '300',
    ABSENT_500 = '500',
    ABSENT_200 = '200',
}
