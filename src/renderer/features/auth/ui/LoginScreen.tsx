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
    const [mode, setMode] = useState<'login' | 'recover'>('login');
    const [username, setUsername] = useState('');
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
                {notice && <Alert tone="success">{notice}</Alert>}
                {error && <Alert tone="error">{error}</Alert>}
                <TextField
                    label={t('auth.login.username')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                />
                <PasswordField
                    label={t('auth.login.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
