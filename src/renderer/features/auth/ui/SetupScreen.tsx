import { ArrowLeft, DatabaseBackup, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { PASSWORD_RULES } from '../../../../shared/auth/types';
import { errorMessage } from '../../../shared/api/call';
import { Alert, Button, PasswordField, TextField } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { useSessionStore } from '../../../stores/sessionStore';
import RestoreBackupFlow from '../../backup/ui/RestoreBackupFlow';
import AuthLayout from './AuthLayout';

/** First run: create the main administrator, or restore everything from a backup. */
export default function SetupScreen() {
    const { t } = useI18nStore();
    const setup = useSessionStore((s) => s.setup);
    const [mode, setMode] = useState<'create' | 'restore'>('create');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const mismatch = confirm.length > 0 && password !== confirm;

    if (mode === 'restore') {
        return (
            <AuthLayout
                title={t('auth.setup.restoreButton')}
                subtitle={t('backups.full.importDescription')}
                width="max-w-xl"
            >
                <RestoreBackupFlow onCancel={() => setMode('create')} />
                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => setMode('create')}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('auth.setup.back')}
                    </button>
                </div>
            </AuthLayout>
        );
    }

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (password !== confirm) return;
        setError(null);
        setBusy(true);
        try {
            await setup({ username, displayName, password });
        } catch (err) {
            setError(errorMessage(err, t));
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthLayout title={t('auth.setup.title')} subtitle={t('auth.setup.subtitle')}>
            <form onSubmit={submit} className="space-y-4">
                {error && <Alert tone="error">{error}</Alert>}
                <TextField
                    label={t('auth.setup.username')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    required
                />
                <TextField
                    label={t('auth.setup.displayName')}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                />
                <PasswordField
                    label={t('auth.setup.password')}
                    hint={t('auth.passwordHint', { min: PASSWORD_RULES.minLength })}
                    value={password}
                    minLength={PASSWORD_RULES.minLength}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <PasswordField
                    label={t('auth.setup.confirmPassword')}
                    value={confirm}
                    error={mismatch ? t('auth.passwordMismatch') : null}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                />
                <Button
                    type="submit"
                    loading={busy}
                    disabled={mismatch}
                    className="w-full"
                    icon={<ShieldCheck className="h-4 w-4" />}
                >
                    {t('auth.setup.submit')}
                </Button>
            </form>

            <div className="mt-6 border-t pt-4 text-center">
                <p className="mb-2 text-sm text-gray-600">{t('auth.setup.orRestore')}</p>
                <Button
                    variant="secondary"
                    onClick={() => setMode('restore')}
                    icon={<DatabaseBackup className="h-4 w-4" />}
                >
                    {t('auth.setup.restoreButton')}
                </Button>
            </div>
        </AuthLayout>
    );
}
