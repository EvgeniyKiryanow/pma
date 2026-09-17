import {
    AlertOctagon,
    CalendarClock,
    Download,
    FolderOpen,
    HardDriveDownload,
    Save,
    Upload,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';

import type { PermissionKey } from '../../../../shared/auth/permissions';
import {
    BACKUP_PASSWORD_MIN_LENGTH,
    type BackupSettings,
    type SnapshotInfo,
} from '../../../../shared/backup/types';
import { ApiError, errorMessage, unwrap } from '../../../shared/api/call';
import {
    Alert,
    Badge,
    Button,
    Card,
    cn,
    formatBytes,
    formatDateTime,
    PasswordField,
    TextField,
} from '../../../shared/ui';
import { toast } from '../../../shared/ui/toast';
import { useI18nStore } from '../../../stores/i18nStore';
import { usePermissions } from '../../../stores/sessionStore';
import RestoreBackupFlow from './RestoreBackupFlow';

type Section = { key: string; labelKey: string; anyOf: PermissionKey[]; render: () => ReactNode };

const SECTIONS: Section[] = [
    {
        key: 'full',
        labelKey: 'backups.nav.full',
        anyOf: ['backup.export', 'backup.import'],
        render: () => <FullBackupSection />,
    },
    {
        key: 'auto',
        labelKey: 'backups.nav.auto',
        anyOf: ['backup.export'],
        render: () => <AutoBackupSection />,
    },
    {
        key: 'changeLog',
        labelKey: 'backups.nav.changeLog',
        anyOf: ['sync.export', 'sync.import'],
        render: () => <ChangeLogSection />,
    },
    {
        key: 'danger',
        labelKey: 'backups.nav.danger',
        anyOf: ['system.reset'],
        render: () => <DangerZoneSection />,
    },
];

export default function BackupPanel() {
    const { t } = useI18nStore();
    const { canAny } = usePermissions();
    const sections = SECTIONS.filter((s) => canAny(...s.anyOf));
    const [activeKey, setActiveKey] = useState(sections[0]?.key);
    const active = sections.find((s) => s.key === activeKey) ?? sections[0];

    return (
        <div className="flex h-full min-h-0 flex-1">
            <aside className="w-56 shrink-0 space-y-1 border-r bg-gray-100 p-4">
                <h2 className="mb-3 text-lg font-semibold text-gray-800">{t('backups.title')}</h2>
                {sections.map((section) => (
                    <button
                        key={section.key}
                        onClick={() => setActiveKey(section.key)}
                        className={cn(
                            'w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-200',
                            active?.key === section.key && 'bg-gray-200 font-medium',
                        )}
                    >
                        {t(section.labelKey)}
                    </button>
                ))}
            </aside>
            <main className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-3xl space-y-6">{active?.render()}</div>
            </main>
        </div>
    );
}

// ------------------------------------------------------------------ Full backup

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
            const exported = await unwrap(window.electronAPI.backup.exportPackage(password));
            setResult(
                t('backups.full.exported', {
                    file: exported.fileName,
                    size: formatBytes(exported.sizeBytes),
                }),
            );
            setPassword('');
            setConfirm('');
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
                unwrap(window.electronAPI.backup.getSettings()),
                unwrap(window.electronAPI.backup.listSnapshots()),
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
            setSettings(await unwrap(window.electronAPI.backup.updateSettings(auto)));
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
            await unwrap(window.electronAPI.backup.createSnapshot());
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
                        void unwrap(window.electronAPI.backup.openBackupsFolder()).catch((err) =>
                            toast.error(errorMessage(err, t)),
                        )
                    }
                >
                    {t('backups.auto.openFolder')}
                </Button>
            }
        >
            <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm text-gray-800">
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
                <p className="text-xs text-gray-500">
                    <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
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

                <div className="border-t pt-4">
                    <h3 className="mb-2 text-sm font-semibold text-gray-900">
                        {t('backups.auto.snapshots')}
                    </h3>
                    {snapshots.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('backups.auto.empty')}</p>
                    ) : (
                        <ul className="divide-y text-sm">
                            {snapshots.map((snapshot) => (
                                <li
                                    key={`${snapshot.kind}-${snapshot.name}`}
                                    className="flex items-center justify-between gap-3 py-2"
                                >
                                    <span
                                        className="truncate font-mono text-xs text-gray-700"
                                        title={snapshot.name}
                                    >
                                        {snapshot.name}
                                    </span>
                                    <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
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
                const result = await window.electronAPI.exportChangeLogs(password);
                if (result.canceled) return;
                if (result.exported > 0)
                    toast.success(t('backups.changeLog.exported', { count: result.exported }));
                else toast.success(t('backups.changeLog.nothing'));
            } else {
                const result = await window.electronAPI.importChangeLogs(password);
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
    const [busy, setBusy] = useState(false);
    const word = t('backups.danger.word');

    const reset = async () => {
        setBusy(true);
        try {
            await unwrap(window.electronAPI.backup.resetAll());
            window.location.reload();
        } catch (err) {
            toast.error(errorMessage(err, t));
            setBusy(false);
        }
    };

    return (
        <Card title={t('backups.danger.title')} className="border-red-200">
            <div className="space-y-4">
                <Alert tone="error">{t('backups.danger.description')}</Alert>
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
