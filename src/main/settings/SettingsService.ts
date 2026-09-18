import { AppError } from '../../shared/ipc/result';
import {
    DEFAULT_SECURITY_SETTINGS,
    IDLE_LOCK_OPTIONS,
    type SecuritySettings,
    type UnitInfo,
} from '../../shared/types/settings';
import type { SettingsRepository } from './SettingsRepository';

const KEYS = {
    security: 'security',
    unitInfo: 'reports.unit-info',
} as const;

const MAX_UNIT_FIELD = 300;

function parse<T>(raw: string | null): Partial<T> {
    if (!raw) return {};
    try {
        const value = JSON.parse(raw);
        return value && typeof value === 'object' ? (value as Partial<T>) : {};
    } catch {
        return {};
    }
}

function isIdleOption(value: unknown): value is SecuritySettings['idleLockMinutes'] {
    return (IDLE_LOCK_OPTIONS as readonly unknown[]).includes(value);
}

/**
 * Settings of the data set. The security policy is read often (the idle lock checks it every
 * few seconds), so it is cached; the cache is dropped when the database is replaced.
 */
export class SettingsService {
    private security: SecuritySettings | null = null;

    constructor(private readonly repository: SettingsRepository) {}

    async getSecurity(): Promise<SecuritySettings> {
        if (this.security) return this.security;
        const stored = parse<SecuritySettings>(await this.repository.get(KEYS.security));
        this.security = {
            idleLockMinutes: isIdleOption(stored.idleLockMinutes)
                ? stored.idleLockMinutes
                : DEFAULT_SECURITY_SETTINGS.idleLockMinutes,
        };
        return this.security;
    }

    async updateSecurity(patch: Partial<SecuritySettings>): Promise<SecuritySettings> {
        const current = await this.getSecurity();
        const next: SecuritySettings = { ...current };
        if (patch.idleLockMinutes !== undefined) {
            if (!isIdleOption(patch.idleLockMinutes)) {
                throw new AppError('VALIDATION', undefined, { field: 'idleLockMinutes' });
            }
            next.idleLockMinutes = patch.idleLockMinutes;
        }
        await this.repository.set(KEYS.security, JSON.stringify(next));
        this.security = next;
        return next;
    }

    /** `null` until someone fills in «Додаткова інформація». */
    async getUnitInfo(): Promise<UnitInfo | null> {
        const stored = parse<UnitInfo>(await this.repository.get(KEYS.unitInfo));
        if (typeof stored.unitName !== 'string' && typeof stored.commanderName !== 'string') {
            return null;
        }
        return {
            unitName: String(stored.unitName ?? ''),
            commanderName: String(stored.commanderName ?? ''),
        };
    }

    /** Saves the unit details; `null` removes them. */
    async updateUnitInfo(info: UnitInfo | null): Promise<UnitInfo | null> {
        if (info === null) {
            await this.repository.remove(KEYS.unitInfo);
            return null;
        }
        const clean = (value: unknown, field: string) => {
            if (typeof value !== 'string' || value.length > MAX_UNIT_FIELD) {
                throw new AppError('VALIDATION', undefined, { field });
            }
            return value.trim();
        };
        const next: UnitInfo = {
            unitName: clean(info.unitName, 'unitName'),
            commanderName: clean(info.commanderName, 'commanderName'),
        };
        await this.repository.set(KEYS.unitInfo, JSON.stringify(next));
        return next;
    }

    /** The database was replaced (restore, reset): read everything again. */
    forget(): void {
        this.security = null;
    }
}
