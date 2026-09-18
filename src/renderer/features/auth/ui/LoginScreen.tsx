import { LogIn } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { errorMessage } from '../../../shared/api/call';
import { Alert, Button, PasswordField, TextField } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { useSessionStore } from '../../../stores/sessionStore';
import AuthLayout from './AuthLayout';
import RecoverPasswordScreen from './RecoverPasswordScreen';

export default function LoginScreen() {
    const { t } = useI18nStore();
    const login = useSessionStore((s) => s.login);
    const lock = useSessionStore((s) => s.lock);
    const dataLocked = useSessionStore((s) => s.dataLocked);
    const [mode, setMode] = useState<'login' | 'recover'>('login');
    // After an automatic lock the same person usually comes back: keep their login.
    const [username, setUsername] = useState(lock?.username ?? '');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    if (mode === 'recover') {
        return (
            <RecoverPasswordScreen
                initialUsername={username}
                onDone={(message) => {
                    setNotice(message);
                    setPassword('');
                    setMode('login');
                }}
                onBack={() => setMode('login')}
            />
        );
    }

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setNotice(null);
        setBusy(true);
        try {
            await login(username, password);
        } catch (err) {
            setError(errorMessage(err, t));
            setPassword('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthLayout title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
            <form onSubmit={submit} className="space-y-4">
                {dataLocked && !notice && !error && (
                    <Alert tone="info" title={t('auth.dataLocked.title')}>
                        {t('auth.dataLocked.text')}
                    </Alert>
                )}
                {lock && !dataLocked && !notice && !error && (
                    <Alert tone="warning" title={t('auth.lock.title')}>
                        {lock.reason === 'idle'
                            ? t('auth.lock.idle', { minutes: lock.idleMinutes })
                            : t('auth.lock.system')}
                    </Alert>
                )}
                {notice && <Alert tone="success">{notice}</Alert>}
                {error && <Alert tone="error">{error}</Alert>}
                <TextField
                    label={t('auth.login.username')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus={!lock}
                    required
                />
                <PasswordField
                    label={t('auth.login.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus={Boolean(lock)}
                    required
                />
                <Button
                    type="submit"
                    loading={busy}
                    className="w-full"
                    icon={<LogIn className="h-4 w-4" />}
                >
                    {t('auth.login.submit')}
                </Button>
                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => setMode('recover')}
                        className="text-sm font-medium text-primary-ink hover:underline"
                    >
                        {t('auth.login.forgot')}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}
