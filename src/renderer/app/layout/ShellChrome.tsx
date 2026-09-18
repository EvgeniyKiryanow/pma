import { FileWarning, HardDriveDownload, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { reminderDue, useBackupSettingsStore } from '../../features/backup/model/backupReminder';
import { useIncompleteHistoryStore } from '../../features/report/model/useIncompleteHistoryStore';
import EventsModalLauncher from '../../shared/components/EventsModalLauncher';
import { Alert, Modal, railChipClass } from '../../shared/ui';
import { useI18nStore } from '../../stores/i18nStore';
import { usePermissions } from '../../stores/sessionStore';
import { useUserStore } from '../../stores/userStore';
import { TABS } from '../navigation';

/** Title bar, left: the current section and today's date. */
export function SectionCrumb() {
    const { t } = useI18nStore();
    const currentTab = useUserStore((s) => s.currentTab);
    const tab = TABS.find((item) => item.key === currentTab);
    const date = new Date().toLocaleDateString('uk-UA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    const today = date.charAt(0).toUpperCase() + date.slice(1);

    return (
        <div className="flex min-w-0 items-center gap-2 text-[13px]">
            {tab && (
                <>
                    <span className="text-rail-ink-2/60">/</span>
                    <span className="truncate font-medium text-rail-ink">{tab.label(t)}</span>
                </>
            )}
            <span className="hidden truncate text-rail-ink-2 lg:inline">· {today}</span>
        </div>
    );
}

/** Title bar, right: things that need attention today. */
export function ShellAlerts() {
    const { can } = usePermissions();
    if (!can('personnel.view')) return null;
    return (
        <div className="mr-1 flex items-center gap-1.5">
            <BackupReminderButton />
            <IncompleteRecordsButton />
            <EventsModalLauncher />
        </div>
    );
}

/** «Копія: 12 дн. тому» — a full backup on a flash drive is overdue (see backupReminder). */
function BackupReminderButton() {
    const { t } = useI18nStore();
    const { can } = usePermissions();
    const allowed = can('backup.export');
    const hasPeople = useUserStore((s) => s.users.length > 0);
    const setCurrentTab = useUserStore((s) => s.setCurrentTab);
    const settings = useBackupSettingsStore((s) => s.settings);
    const load = useBackupSettingsStore((s) => s.load);

    useEffect(() => {
        if (allowed) void load();
    }, [allowed, load]);

    const due = reminderDue(settings);
    if (!allowed || !hasPeople || due === null) return null;
    return (
        <button
            onClick={() => setCurrentTab('backups')}
            title={t('backups.reminder.chipTitle')}
            className={railChipClass('brass')}
        >
            <HardDriveDownload className="size-3.5" />
            <span>
                {due === 'never'
                    ? t('backups.reminder.chipNever')
                    : t('backups.reminder.chipDays', { days: due })}
            </span>
        </button>
    );
}

const REASON_LABELS = {
    missing_file: 'відсутній файл',
    missing_period: 'відсутній період',
    missing_both: 'немає файлу та періоду',
} as const;

function IncompleteRecordsButton() {
    const { t } = useI18nStore();
    const users = useUserStore((s) => s.users);
    const setCurrentTab = useUserStore((s) => s.setCurrentTab);
    const setSelectedUser = useUserStore((s) => s.setSelectedUser);
    const entries = useIncompleteHistoryStore((s) => s.entries);
    const load = useIncompleteHistoryStore((s) => s.load);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        void load();
    }, [users, load]);

    const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
    const byUser = useMemo(() => {
        const groups = new Map<number, typeof entries>();
        for (const entry of entries) {
            groups.set(entry.userId, [...(groups.get(entry.userId) ?? []), entry]);
        }
        return [...groups.entries()];
    }, [entries]);

    if (entries.length === 0) return null;

    const openUser = (userId: number) => {
        const user = usersById.get(userId);
        if (!user) return;
        setCurrentTab('manager');
        void setSelectedUser(user);
        setOpen(false);
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                title={t('shell.incomplete')}
                className={railChipClass('danger')}
            >
                <FileWarning className="size-3.5" />
                <span className="tabular-nums">{entries.length}</span>
                <span className="hidden xl:inline">без файлу / періоду</span>
            </button>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title="Записи без файлу або періоду"
                description={`${entries.length} записів про зміну статусу потребують доповнення`}
                icon={<FileWarning />}
                width="max-w-2xl"
            >
                <Alert tone="warning" className="mb-4">
                    Відкрийте військовослужбовця зі списку нижче, у його історії знайдіть записи з
                    позначкою <strong>«Відсутній файл або період»</strong> і додайте файл та/або
                    період.
                </Alert>
                <ul className="space-y-2">
                    {byUser.map(([userId, userEntries]) => {
                        const user = usersById.get(userId);
                        return (
                            <li
                                key={userId}
                                className="rounded-xl border border-line bg-surface-2 p-3"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <UserRound className="size-4 shrink-0 text-ink-3" />
                                        <span className="truncate font-medium text-ink">
                                            {user?.fullName || `Військовослужбовець #${userId}`}
                                        </span>
                                    </div>
                                    {user && (
                                        <button
                                            onClick={() => openUser(userId)}
                                            className="shrink-0 text-[13px] font-medium text-primary-ink hover:underline"
                                        >
                                            Відкрити картку →
                                        </button>
                                    )}
                                </div>
                                <ul className="mt-2 flex flex-wrap gap-1.5">
                                    {userEntries.map((entry) => (
                                        <li
                                            key={entry.entryId}
                                            className="rounded-md bg-danger-soft px-2 py-0.5 text-xs text-danger-ink"
                                        >
                                            №{entry.entryId}: {REASON_LABELS[entry.reason]}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        );
                    })}
                </ul>
            </Modal>
        </>
    );
}
