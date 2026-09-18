import { FileSearch, FolderOpen, RotateCcw } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

import { PASSWORD_RULES } from '../../../../shared/auth/types';
import type { ImportInspection, ImportSelection } from '../../../../shared/backup/types';
import { backupApi } from '../../../shared/api/backup';
import { ApiError, errorMessage } from '../../../shared/api/call';
import {
    Alert,
    Button,
    formatBytes,
    formatDateTime,
    PasswordField,
    TextField,
} from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { useOpenedBackupStore } from '../model/openedBackup';

/**
 * Select → (password) → inspect → confirm → restore.
 * Nothing is changed until the last step; the main process keeps the selected file,
 * the renderer never passes file paths.
 */
export default function RestoreBackupFlow({ onCancel }: { onCancel?: () => void }) {
    const { t } = useI18nStore();
    const [selection, setSelection] = useState<ImportSelection | null>(null);
    const [password, setPassword] = useState('');
    const [inspection, setInspection] = useState<ImportInspection | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<'select' | 'inspect' | 'restore' | null>(null);
    // A computer without accounts: the administrator who signs in after the restore.
    const [adminLogin, setAdminLogin] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminConfirm, setAdminConfirm] = useState('');
    const needsAdministrator = !!inspection && !inspection.keepsAccount;
    const adminMismatch = adminConfirm.length > 0 && adminConfirm !== adminPassword;
    const adminReady =
        adminLogin.trim().length > 0 && adminPassword.length > 0 && adminConfirm === adminPassword;

    const run = async (step: 'select' | 'inspect' | 'restore', work: () => Promise<void>) => {
        setError(null);
        setBusy(step);
        try {
            await work();
        } catch (err) {
            if (!(err instanceof ApiError && err.code === 'CANCELED'))
                setError(errorMessage(err, t));
        } finally {
            setBusy(null);
        }
    };

    const select = () =>
        run('select', async () => {
            const selected = await backupApi.selectImportFile();
            setSelection(selected);
            setInspection(null);
            setPassword('');
            if (!selected.requiresPassword) {
                setInspection(await backupApi.inspect(''));
            }
        });

    // A .pmb file opened with the program (double-click): chosen already, as from the dialog.
    const openedName = useOpenedBackupStore((s) => s.name);
    useEffect(() => {
        if (!openedName) return;
        useOpenedBackupStore.getState().clear();
        void run('select', async () => {
            const selected = await backupApi.selectOpenedFile();
            setSelection(selected);
            setInspection(null);
            setPassword('');
            if (!selected.requiresPassword) setInspection(await backupApi.inspect(''));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openedName]);

    const inspect = (event: FormEvent) => {
        event.preventDefault();
        void run('inspect', async () => {
            setInspection(await backupApi.inspect(password));
        });
    };

    const restore = () =>
        run('restore', async () => {
            await backupApi.restore(
                needsAdministrator
                    ? { administrator: { username: adminLogin.trim(), password: adminPassword } }
                    : undefined,
            );
            // Sessions were ended by the main process; start clean on the login screen.
            window.location.reload();
        });

    return (
        <div className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}

            <div className="flex flex-wrap items-center gap-3">
                <Button
                    variant="secondary"
                    onClick={select}
                    loading={busy === 'select'}
                    icon={<FolderOpen className="h-4 w-4" />}
                >
                    {t('backups.full.selectFile')}
                </Button>
                {selection && (
                    <span className="truncate text-sm text-ink-2">
                        {t('backups.full.selected', {
                            file: selection.fileName,
                            size: formatBytes(selection.sizeBytes),
                        })}
                    </span>
                )}
            </div>

            {selection?.requiresPassword && !inspection && (
                <form onSubmit={inspect} className="flex flex-wrap items-end gap-3">
                    <PasswordField
                        className="min-w-[240px] flex-1"
                        label={t('backups.full.importPassword')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                        required
                    />
                    <Button
                        type="submit"
                        loading={busy === 'inspect'}
                        icon={<FileSearch className="h-4 w-4" />}
                    >
                        {t('backups.full.check')}
                    </Button>
                </form>
            )}

            {inspection && (
                <div className="animate-fade-in space-y-3 rounded-xl border border-line bg-surface-2 p-4">
                    <h3 className="text-sm font-semibold text-ink">
                        {t('backups.full.inspectionTitle')}
                    </h3>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        {inspection.manifest && (
                            <>
                                <dt className="text-ink-3">{t('backups.full.createdAt')}</dt>
                                <dd className="font-medium text-ink">
                                    {formatDateTime(inspection.manifest.createdAt)}
                                </dd>
                                <dt className="text-ink-3">{t('backups.full.appVersion')}</dt>
                                <dd className="font-medium text-ink">
                                    {inspection.manifest.appVersion}
                                </dd>
                                {inspection.manifest.counts.documents !== undefined ? (
                                    <>
                                        <dt className="text-ink-3">
                                            {t('backups.full.documents')}
                                        </dt>
                                        <dd className="font-medium text-ink">
                                            {inspection.manifest.counts.documents}
                                        </dd>
                                    </>
                                ) : (
                                    <>
                                        <dt className="text-ink-3">{t('backups.full.files')}</dt>
                                        <dd className="font-medium text-ink">
                                            {inspection.manifest.counts.files}
                                        </dd>
                                    </>
                                )}
                            </>
                        )}
                        <dt className="text-ink-3">{t('backups.full.personnel')}</dt>
                        <dd className="font-medium text-ink">{inspection.personnelCount}</dd>
                        <dt className="text-ink-3">{t('backups.full.accounts')}</dt>
                        <dd className="font-medium text-ink">{inspection.accountCount}</dd>
                    </dl>
                    {!inspection.includesFiles && (
                        <Alert tone="info">{t('backups.full.legacy')}</Alert>
                    )}
                    {inspection.includesFiles && inspection.willMigrate && (
                        <Alert tone="info">{t('backups.full.willMigrate')}</Alert>
                    )}
                    {needsAdministrator && (
                        <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
                            <div>
                                <p className="text-sm font-semibold text-ink">
                                    {t('backups.full.administratorTitle')}
                                </p>
                                <p className="mt-0.5 text-[13px] text-ink-2">
                                    {t('backups.full.administratorHint')}
                                </p>
                                {!!inspection.accountLogins?.length && (
                                    <p className="mt-1 text-[13px] text-ink-3">
                                        {t('backups.full.accountLogins', {
                                            logins: inspection.accountLogins.join(', '),
                                        })}
                                    </p>
                                )}
                            </div>
                            <TextField
                                label={t('backups.full.administratorLogin')}
                                value={adminLogin}
                                onChange={(e) => setAdminLogin(e.target.value)}
                                autoComplete="off"
                                required
                            />
                            <PasswordField
                                label={t('backups.full.administratorPassword')}
                                hint={t('auth.passwordHint', { min: PASSWORD_RULES.minLength })}
                                value={adminPassword}
                                minLength={PASSWORD_RULES.minLength}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                required
                            />
                            <PasswordField
                                label={t('backups.full.administratorConfirm')}
                                value={adminConfirm}
                                error={adminMismatch ? t('auth.passwordMismatch') : null}
                                onChange={(e) => setAdminConfirm(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <Alert tone="warning">
                        {t('backups.full.restoreWarning')}{' '}
                        {inspection.keepsAccount
                            ? t('backups.full.keepsAccount', { login: inspection.keepsAccount })
                            : t('backups.full.administratorAfter', {
                                  login: adminLogin.trim() || '…',
                              })}
                    </Alert>
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setSelection(null);
                                setInspection(null);
                                onCancel?.();
                            }}
                        >
                            {t('backups.full.cancel')}
                        </Button>
                        <Button
                            variant="danger"
                            onClick={restore}
                            disabled={needsAdministrator && !adminReady}
                            loading={busy === 'restore'}
                            icon={<RotateCcw className="h-4 w-4" />}
                        >
                            {t('backups.full.restore')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
