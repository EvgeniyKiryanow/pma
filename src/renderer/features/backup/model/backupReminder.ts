import { create } from 'zustand';

import type { BackupSettings } from '../../../../shared/backup/types';
import { backupApi } from '../../../shared/api/backup';

const DAY_MS = 86_400_000;

type ReminderSettings = Pick<BackupSettings, 'lastFullBackupAt' | 'remindAfterDays'>;

/** Whole days since `iso` (0 on the same day). */
export function daysSince(iso: string, now = Date.now()): number {
    return Math.max(0, Math.floor((now - Date.parse(iso)) / DAY_MS));
}

/**
 * Whether to remind about a full backup on a flash drive: the days since the last one when it
 * is overdue, 'never' when none was ever saved here, null when there is nothing to remind.
 * Local automatic copies do not count — they are on the same disk.
 */
export function reminderDue(
    settings: ReminderSettings | null,
    now = Date.now(),
): number | 'never' | null {
    if (!settings || !settings.remindAfterDays) return null;
    if (!settings.lastFullBackupAt) return 'never';
    const days = daysSince(settings.lastFullBackupAt, now);
    return days >= settings.remindAfterDays ? days : null;
}

type BackupSettingsState = {
    settings: BackupSettings | null;
    load: () => Promise<void>;
    replace: (settings: BackupSettings) => void;
};

/** Backup settings shared by the title-bar reminder and the backup screen. */
export const useBackupSettingsStore = create<BackupSettingsState>((set) => ({
    settings: null,
    load: async () => {
        try {
            set({ settings: await backupApi.getSettings() });
        } catch {
            set({ settings: null });
        }
    },
    replace: (settings) => set({ settings }),
}));
