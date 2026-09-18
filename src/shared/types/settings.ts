/** Security policy of this data set (stored in the database, restored with backups). */
export type SecuritySettings = {
    /** Minutes without keyboard or mouse input before the screen locks. */
    idleLockMinutes: number;
};

export const IDLE_LOCK_OPTIONS = [1, 2, 3, 5, 10, 15, 20, 30, 45, 60] as const;

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = { idleLockMinutes: 10 };

/** Unit details printed on generated documents («Додаткова інформація» of the reports). */
export type UnitInfo = {
    unitName: string;
    commanderName: string;
};
