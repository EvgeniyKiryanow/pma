import { ArrowLeft, KeyRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { PASSWORD_RULES } from '../../../../shared/auth/types';
import { errorMessage } from '../../../shared/api/call';
import { authApi } from '../../../shared/api/security';
import { Alert, Button, PasswordField, TextField } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import AuthLayout from './AuthLayout';

export default function RecoverPasswordScreen({
    initialUsername,
    onDone,
    onBack,
}: {
    initialUsername: string;
    onDone: (message: string) => void;
    onBack: () => void;
}) {
    const { t } = useI18nStore();
    const [username, setUsername] = useState(initialUsername);
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const mismatch = confirm.length > 0 && password !== confirm;

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (password !== confirm) return;
        setError(null);
        setBusy(true);
        try {
            await authApi.recover(username, code, password);
            onDone(t('auth.recover.success'));
        } catch (err) {
            setError(errorMessage(err, t));
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthLayout title={t('auth.recover.title')} subtitle={t('auth.recover.subtitle')}>
            <form onSubmit={submit} className="space-y-4">
                {error && <Alert tone="error">{error}</Alert>}
                <TextField
                    label={t('auth.recover.username')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <TextField
                    label={t('auth.recover.code')}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="font-mono"
                    autoComplete="off"
                    spellCheck={false}
                    required
                />
                <PasswordField
                    label={t('auth.recover.newPassword')}
                    hint={t('auth.passwordHint', { min: PASSWORD_RULES.minLength })}
                    value={password}
                    minLength={PASSWORD_RULES.minLength}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <PasswordField
                    label={t('auth.recover.confirmPassword')}
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
                    icon={<KeyRound className="h-4 w-4" />}
                >
                    {t('auth.recover.submit')}
                </Button>
                <p className="text-center text-xs text-ink-3">{t('auth.recover.noCode')}</p>
                <div className="text-center">
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-ink hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('auth.recover.back')}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}
