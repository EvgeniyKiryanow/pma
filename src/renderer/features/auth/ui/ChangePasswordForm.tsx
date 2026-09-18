import { KeyRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { PASSWORD_RULES } from '../../../../shared/auth/types';
import { errorMessage } from '../../../shared/api/call';
import { Alert, Button, PasswordField } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { useSessionStore } from '../../../stores/sessionStore';

export default function ChangePasswordForm({ onChanged }: { onChanged?: () => void }) {
    const { t } = useI18nStore();
    const changePassword = useSessionStore((s) => s.changePassword);
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const mismatch = confirm.length > 0 && next !== confirm;

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (next !== confirm) return;
        setError(null);
        setBusy(true);
        try {
            await changePassword(current, next);
            setCurrent('');
            setNext('');
            setConfirm('');
            onChanged?.();
        } catch (err) {
            setError(errorMessage(err, t));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}
            <PasswordField
                label={t('auth.changePassword.current')}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
            />
            <PasswordField
                label={t('auth.changePassword.next')}
                hint={t('auth.passwordHint', { min: PASSWORD_RULES.minLength })}
                value={next}
                minLength={PASSWORD_RULES.minLength}
                onChange={(e) => setNext(e.target.value)}
                required
            />
            <PasswordField
                label={t('auth.changePassword.confirm')}
                value={confirm}
                error={mismatch ? t('auth.passwordMismatch') : null}
                onChange={(e) => setConfirm(e.target.value)}
                required
            />
            <Button
                type="submit"
                loading={busy}
                disabled={mismatch}
                icon={<KeyRound className="h-4 w-4" />}
            >
                {t('auth.changePassword.submit')}
            </Button>
        </form>
    );
}
