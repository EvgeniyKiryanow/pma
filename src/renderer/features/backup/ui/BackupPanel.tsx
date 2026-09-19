import {
    AlertOctagon,
    ArrowLeftRight,
    CalendarClock,
    Download,
    FolderOpen,
    HardDriveDownload,
    Save,
    ShieldAlert,
    Trash2,
    Upload,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';

import type { PermissionKey } from '../../../../shared/auth/permissions';
import {
    BACKUP_PASSWORD_MIN_LENGTH,
    BACKUP_REMINDER_OPTIONS,
    type BackupReminderDays,
    type BackupSettings,
    type SnapshotInfo,
} from '../../../../shared/backup/types';
import { backupApi, changeLogApi } from '../../../shared/api/backup';
import { ApiError, errorMessage } from '../../../shared/api/call';
import {
    Alert,
    Badge,
    Button,
    Card,
    Checkbox,
    formatBytes,
    formatDateTime,
    PasswordField,
    SelectField,
    TextField,
} from '../../../shared/ui';
import SideNav from '../../../shared/ui/SideNav';
import { toast } from '../../../shared/ui/toast';
import { useI18nStore } from '../../../stores/i18nStore';
import { usePermissions } from '../../../stores/sessionStore';
import { daysSince, useBackupSettingsStore } from '../model/backupReminder';
import { useOpenedBackupStore } from '../model/openedBackup';
import RestoreBackupFlow from './RestoreBackupFlow';

type Section = {
    key: string;
    labelKey: string;
    hintKey: string;
    icon: ReactNode;
    danger?: boolean;
    anyOf: PermissionKey[];
    render: () => ReactNode;
};

const SECTIONS: Section[] = [
    {
        key: 'full',
        labelKey: 'backups.nav.full',
        hintKey: 'backups.navHint.full',
        icon: <HardDriveDownload />,
        anyOf: ['backup.export', 'backup.import'],
        render: () => <FullBackupSection />,
    },
    {
        key: 'auto',
        labelKey: 'backups.nav.auto',
        hintKey: 'backups.navHint.auto',
        icon: <CalendarClock />,
        anyOf: ['backup.export'],
        render: () => <AutoBackupSection />,
    },
    {
        key: 'changeLog',
        labelKey: 'backups.nav.changeLog',
        hintKey: 'backups.navHint.changeLog',
        icon: <ArrowLeftRight />,
        anyOf: ['sync.export', 'sync.import'],
        render: () => <ChangeLogSection />,
    },
    {
        key: 'danger',
        labelKey: 'backups.nav.danger',
        hintKey: 'backups.navHint.danger',
        icon: <ShieldAlert />,
        danger: true,
        anyOf: ['system.reset'],
        render: () => (
            <div className="space-y-5">
                <DangerZoneSection />
                <UninstallSection />
            </div>
        ),
    },
];

export default function BackupPanel() {
    const { t } = useI18nStore();
    const { canAny } = usePermissions();
    const sections = SECTIONS.filter((s) => canAny(...s.anyOf));
    const [activeKey, setActiveKey] = useState(sections[0]?.key);
    const active = sections.find((s) => s.key === activeKey) ?? sections[0];
    // Opened with a backup file: show the restore card.
    const openedBackup = useOpenedBackupStore((s) => s.name);
    useEffect(() => {
        if (openedBackup) setActiveKey('full');
    }, [openedBackup]);

    return (
        <div className="flex min-h-0 flex-1">
            <SideNav
                title={t('backups.title')}
                value={active?.key ?? ''}
                onChange={setActiveKey}
                items={sections.map((section) => ({
                    value: section.key,
                    label: t(section.labelKey),
                    description: t(section.hintKey),
                    icon: section.icon,
                    tone: section.danger ? 'danger' : 'default',
                }))}
            />
            <main className="min-w-0 flex-1 overflow-y-auto p-6">
                <div key={active?.key} className="mx-auto max-w-3xl animate-fade-in space-y-5">
                    {active?.render()}
                </div>
            </main>
        </div>
    );
}

// ------------------------------------------------------------------ Full backup

/** When the last full backup was saved here, and after how many days to remind. */
function BackupReminderSettings() {
    const { t } = useI18nStore();
    const settings = useBackupSettingsStore((s) => s.settings);
    const load = useBackupSettingsStore((s) => s.load);
    const replace = useBackupSettingsStore((s) => s.replace);

    useEffect(() => {
        void load();
    }, [load]);

    if (!settings) return null;
    const last = settings.lastFullBackupAt;
    const change = async (value: string) => {
        try {
            replace(
                await backupApi.updateSettings({
                    remindAfterDays: Number(value) as BackupReminderDays,
                }),
            );
        } catch (err) {
            toast.error(errorMessage(err, t));
        }
    };

    return (
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line bg-surface-2 p-3">
            <p className="text-sm text-ink-2">
                {last
                    ? t('backups.reminder.last', {
                          date: formatDateTime(last),
                          days: daysSince(last),
                      })
                    : t('backups.reminder.never')}
            </p>
            <SelectField
                label={t('backups.reminder.label')}
                value={settings.remindAfterDays}
                onChange={(value) => void change(value)}
                options={BACKUP_REMINDER_OPTIONS.map((days) => ({
                    value: days,
                    label: days ? t('backups.reminder.after', { days }) : t('backups.reminder.off'),
                }))}
                className="w-48"
            />
        </div>
    );
}

function FullBackupSection() {
    const { t } = useI18nStore();
    const { can } = usePermissions();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const mismatch = confirm.length > 0 && password !== confirm;

    const exportBackup = async (event: FormEvent) => {
        event.preventDefault();
        if (password !== confirm) return;
        setBusy(true);
        setError(null);
        setResult(null);
        try {
            const exported = await backupApi.exportPackage(password);
            setResult(
                t('backups.full.exported', {
                    file: exported.fileName,
                    size: formatBytes(exported.sizeBytes),
                }),
            );
            setPassword('');
            setConfirm('');
            void useBackupSettingsStore.getState().load();
        } catch (err) {
            if (!(err instanceof ApiError && err.code === 'CANCELED'))
                setError(errorMessage(err, t));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            {can('backup.export') && (
                <Card
                    title={t('backups.full.exportTitle')}
                    description={t('backups.full.exportDescription')}
                >
                    <form onSubmit={exportBackup} className="space-y-4">
                        <BackupReminderSettings />
                        {result && <Alert tone="success">{result}</Alert>}
                        {error && <Alert tone="error">{error}</Alert>}
                        <div className="grid gap-4 md:grid-cols-2">
                            <PasswordField
                                label={t('backups.full.password')}
                                hint={t('backups.full.passwordHint', {
                                    min: BACKUP_PASSWORD_MIN_LENGTH,
                                })}
                                value={password}
                                minLength={BACKUP_PASSWORD_MIN_LENGTH}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <PasswordField
                                label={t('backups.full.confirmPassword')}
                                value={confirm}
                                error={mismatch ? t('auth.passwordMismatch') : null}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            loading={busy}
                            disabled={mismatch}
                            icon={<HardDriveDownload className="h-4 w-4" />}
                        >
                            {t('backups.full.export')}
                        </Button>
                    </form>
                </Card>
            )}

            {can('backup.import') && (
                <Card
                    title={t('backups.full.importTitle')}
                    description={t('backups.full.importDescription')}
                >
                    <RestoreBackupFlow />
                </Card>
            )}
        </>
    );
}

// ------------------------------------------------------------------ Automatic copies

function AutoBackupSection() {
    const { t } = useI18nStore();
    const [settings, setSettings] = useState<BackupSettings | null>(null);
    const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
    const [busy, setBusy] = useState<'save' | 'snapshot' | null>(null);

    const load = useCallback(async () => {
        try {
            const [nextSettings, nextSnapshots] = await Promise.all([
                backupApi.getSettings(),
                backupApi.listSnapshots(),
            ]);
            setSettings(nextSettings);
            setSnapshots(nextSnapshots);
        } catch (err) {
            toast.error(errorMessage(err, t));
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    if (!settings) return null;
    const auto = settings.autoBackup;
    const update = (patch: Partial<typeof auto>) =>
        setSettings({ ...settings, autoBackup: { ...auto, ...patch } });

    const save = async () => {
        setBusy('save');
        try {
            setSettings(await backupApi.updateSettings(auto));
            toast.success(t('backups.auto.saved'));
        } catch (err) {
            toast.error(errorMessage(err, t));
        } finally {
            setBusy(null);
        }
    };

    const snapshotNow = async () => {
        setBusy('snapshot');
        try {
            await backupApi.createSnapshot();
            toast.success(t('backups.auto.created'));
            await load();
        } catch (err) {
            toast.error(errorMessage(err, t));
        } finally {
            setBusy(null);
        }
    };

    return (
        <Card
            title={t('backups.auto.title')}
            description={t('backups.auto.description')}
            actions={
                <Button
                    variant="secondary"
                    icon={<FolderOpen className="h-4 w-4" />}
                    onClick={() =>
                        void backupApi
                            .openBackupsFolder()
                            .catch((err) => toast.error(errorMessage(err, t)))
                    }
                >
                    {t('backups.auto.openFolder')}
                </Button>
            }
        >
            <div className="space-y-4">
                <label className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-sm font-medium text-ink">
                    <input
                        type="checkbox"
                        checked={auto.enabled}
                        onChange={(e) => update({ enabled: e.target.checked })}
                    />
                    {t('backups.auto.enabled')}
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                        type="number"
                        min={1}
                        max={90}
                        label={t('backups.auto.interval')}
                        value={auto.intervalDays}
                        disabled={!auto.enabled}
                        onChange={(e) => update({ intervalDays: Number(e.target.value) })}
                    />
                    <TextField
                        type="number"
                        min={1}
                        max={100}
                        label={t('backups.auto.keep')}
                        value={auto.keep}
                        onChange={(e) => update({ keep: Number(e.target.value) })}
                    />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-ink-3">
                    <CalendarClock className="size-3.5" />
                    {t('backups.auto.last', { time: formatDateTime(settings.lastAutoBackupAt) })}
                </p>
                <div className="flex flex-wrap gap-2">
                    <Button
                        loading={busy === 'save'}
                        icon={<Save className="h-4 w-4" />}
                        onClick={() => void save()}
                    >
                        {t('backups.auto.save')}
                    </Button>
                    <Button
                        variant="secondary"
                        loading={busy === 'snapshot'}
                        onClick={() => void snapshotNow()}
                    >
                        {t('backups.auto.createNow')}
                    </Button>
                </div>

                <div className="border-t border-line pt-5">
                    <h3 className="mb-2 text-sm font-semibold text-ink">
                        {t('backups.auto.snapshots')}
                    </h3>
                    {snapshots.length === 0 ? (
                        <p className="text-sm text-ink-3">{t('backups.auto.empty')}</p>
                    ) : (
                        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line text-sm">
                            {snapshots.map((snapshot) => (
                                <li
                                    key={`${snapshot.kind}-${snapshot.name}`}
                                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-surface-2"
                                >
                                    <span
                                        className="truncate font-mono text-xs text-ink-2"
                                        title={snapshot.name}
                                    >
                                        {snapshot.name}
                                    </span>
                                    <span className="flex shrink-0 items-center gap-2 text-xs text-ink-3">
                                        <Badge tone={snapshot.kind === 'auto' ? 'gray' : 'amber'}>
                                            {snapshot.kind === 'auto'
                                                ? t('backups.auto.kindAuto')
                                                : t('backups.auto.kindSafety')}
                                        </Badge>
                                        {formatDateTime(snapshot.createdAt)} ·{' '}
                                        {formatBytes(snapshot.sizeBytes)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Card>
    );
}

// ------------------------------------------------------------------ Change log (legacy exchange)

function ChangeLogSection() {
    const { t } = useI18nStore();
    const { can } = usePermissions();
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState<'export' | 'import' | null>(null);

    const run = async (kind: 'export' | 'import') => {
        if (password.length < BACKUP_PASSWORD_MIN_LENGTH) {
            toast.error(t('auth.passwordHint', { min: BACKUP_PASSWORD_MIN_LENGTH }));
            return;
        }
        setBusy(kind);
        try {
            if (kind === 'export') {
                const result = await changeLogApi.export(password);
                if (result.canceled) return;
                if (result.remaining)
                    toast.warning(
                        t('backups.changeLog.exportedPart', {
                            count: result.exported,
                            remaining: result.remaining,
                        }),
                    );
                else if (result.exported > 0)
                    toast.success(t('backups.changeLog.exported', { count: result.exported }));
                else toast.success(t('backups.changeLog.nothing'));
            } else {
                const result = await changeLogApi.import(password);
                if (result.canceled) return;
                if (result.error) {
                    toast.error(
                        t(
                            result.error === 'invalid-password'
                                ? 'errors.INVALID_PASSWORD'
                                : 'errors.CORRUPTED',
                        ),
                    );
                    return;
                }
                toast.success(
                    t('backups.changeLog.imported', {
                        imported: result.imported,
                        skipped: result.skipped ?? 0,
                        failed: result.failed ?? 0,
                    }),
                );
            }
            setPassword('');
        } catch (err) {
            toast.error(errorMessage(err, t));
        } finally {
            setBusy(null);
        }
    };

    return (
        <Card title={t('backups.changeLog.title')} description={t('backups.changeLog.description')}>
            <div className="space-y-4">
                <Alert tone="warning">{t('backups.changeLog.warning')}</Alert>
                <PasswordField
                    label={t('backups.changeLog.password')}
                    hint={t('auth.passwordHint', { min: BACKUP_PASSWORD_MIN_LENGTH })}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                    {can('sync.export') && (
                        <Button
                            loading={busy === 'export'}
                            icon={<Download className="h-4 w-4" />}
                            onClick={() => void run('export')}
                        >
                            {t('backups.changeLog.export')}
                        </Button>
                    )}
                    {can('sync.import') && (
                        <Button
                            variant="secondary"
                            loading={busy === 'import'}
                            icon={<Upload className="h-4 w-4" />}
                            onClick={() => void run('import')}
                        >
                            {t('backups.changeLog.import')}
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}

// ------------------------------------------------------------------ Erase everything

function DangerZoneSection() {
    const { t } = useI18nStore();
    const [confirmation, setConfirmation] = useState('');
    const [destroyCopies, setDestroyCopies] = useState(false);
    const [busy, setBusy] = useState(false);
    const word = t('backups.danger.word');

    const reset = async () => {
        setBusy(true);
        try {
            await backupApi.resetAll({ destroyLocalCopies: destroyCopies });
            window.location.reload();
        } catch (err) {
            toast.error(errorMessage(err, t));
            setBusy(false);
        }
    };

    return (
        <Card
            title={t('backups.danger.title')}
            icon={<ShieldAlert />}
            className="border-danger-line"
        >
            <div className="space-y-4">
                <Alert tone="error">
                    {destroyCopies
                        ? t('backups.danger.descriptionDestroy')
                        : t('backups.danger.description')}
                </Alert>
                <Checkbox
                    checked={destroyCopies}
                    onChange={setDestroyCopies}
                    label={t('backups.danger.destroyCopies')}
                    description={t('backups.danger.destroyCopiesHint')}
                />
                <TextField
                    label={t('backups.danger.confirmLabel', { word })}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    autoComplete="off"
                />
                <Button
                    variant="danger"
                    disabled={confirmation.trim() !== word}
                    loading={busy}
                    icon={<AlertOctagon className="h-4 w-4" />}
                    onClick={() => void reset()}
                >
                    {t('backups.danger.button')}
                </Button>
            </div>
        </Card>
    );
}

/** Installed copies only: destroy everything, then remove the program from the computer. */
function UninstallSection() {
    const { t } = useI18nStore();
    const [available, setAvailable] = useState(false);
    const [confirmation, setConfirmation] = useState('');
    const [busy, setBusy] = useState(false);
    const word = t('backups.uninstall.word');

    useEffect(() => {
        backupApi
            .canUninstall()
            .then(setAvailable)
            .catch(() => setAvailable(false));
    }, []);

    if (!available) return null;

    const uninstall = async () => {
        setBusy(true);
        try {
            await backupApi.uninstall();
        } catch (err) {
            toast.error(errorMessage(err, t));
            setBusy(false);
        }
    };

    return (
        <Card title={t('backups.uninstall.title')} icon={<Trash2 />} className="border-danger-line">
            <div className="space-y-4">
                <Alert tone="error">{t('backups.uninstall.description')}</Alert>
                <TextField
                    label={t('backups.danger.confirmLabel', { word })}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    autoComplete="off"
                />
                <Button
                    variant="danger"
                    disabled={confirmation.trim() !== word}
                    loading={busy}
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => void uninstall()}
                >
                    {busy ? t('backups.uninstall.progress') : t('backups.uninstall.button')}
                </Button>
            </div>
        </Card>
    );
}
