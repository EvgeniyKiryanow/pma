import { describe, expect, it } from 'vitest';

import { daysSince, reminderDue } from './backupReminder';

const NOW = Date.parse('2026-09-30T12:00:00.000Z');
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

describe('reminderDue', () => {
    it('reminds when no full backup was ever saved on this computer', () => {
        expect(reminderDue({ lastFullBackupAt: null, remindAfterDays: 7 }, NOW)).toBe('never');
    });

    it('reminds once the chosen number of days has passed', () => {
        expect(reminderDue({ lastFullBackupAt: daysAgo(6), remindAfterDays: 7 }, NOW)).toBeNull();
        expect(reminderDue({ lastFullBackupAt: daysAgo(7), remindAfterDays: 7 }, NOW)).toBe(7);
        expect(reminderDue({ lastFullBackupAt: daysAgo(12), remindAfterDays: 7 }, NOW)).toBe(12);
    });

    it('stays silent when reminders are switched off or settings are unknown', () => {
        expect(reminderDue({ lastFullBackupAt: null, remindAfterDays: 0 }, NOW)).toBeNull();
        expect(reminderDue(null, NOW)).toBeNull();
    });
});

describe('daysSince', () => {
    it('counts whole days and never goes below zero', () => {
        expect(daysSince(daysAgo(0.5), NOW)).toBe(0);
        expect(daysSince(daysAgo(3.9), NOW)).toBe(3);
        expect(daysSince(new Date(NOW + 60_000).toISOString(), NOW)).toBe(0);
    });
});
