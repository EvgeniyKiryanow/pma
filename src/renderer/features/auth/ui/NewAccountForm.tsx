import { ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { PASSWORD_RULES } from '../../../../shared/auth/types';
import { errorMessage } from '../../../shared/api/call';
import { Alert, Button, PasswordField, TextField } from '../../../shared/ui';
import { confirmAction } from '../../../shared/ui/confirm';
import { useI18nStore } from '../../../stores/i18nStore';
import { useSessionStore } from '../../../stores/sessionStore';

/**
 * The «Новий обліковий запис» tab. First run: the main administrator. With accounts already
 * here (nobody remembers a password): the main process sets the current data aside and the
 * new administrator starts with an empty data set.
 */
export default function NewAccountForm({ hasAccounts }: { hasAccounts: boolean }) {
    const { t } = useI18nStore();
    const setup = useSessionStore((s) => s.setup);
    const startOver = useSessionStore((s) => s.startOver);
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const mismatch = confirm.length > 0 && password !== confirm;

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (password !== confirm) return;
        setError(null);
        if (hasAccounts) {
            const confirmed = await confirmAction({
                title: t('auth.startOver.confirmTitle'),
                message: t('auth.startOver.confirmMessage', { login: username.trim() }),
                confirmLabel: t('auth.startOver.confirm'),
                tone: 'danger',
            });
            if (!confirmed) return;
        }
        setBusy(true);
        try {
            const input = { username, displayName, password };
            await (hasAccounts ? startOver(input) : setup(input));
        } catch (err) {
            setError(errorMessage(err, t));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            {hasAccounts && (
                <Alert tone="warning" title={t('auth.startOver.warningTitle')}>
                    {t('auth.startOver.warning')}
                </Alert>
            )}
            {error && <Alert tone="error">{error}</Alert>}
            <TextField
                label={t('auth.setup.username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
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
                variant={hasAccounts ? 'danger' : 'primary'}
                loading={busy}
                disabled={mismatch}
                className="w-full"
                icon={<ShieldCheck className="h-4 w-4" />}
            >
                {hasAccounts ? t('auth.startOver.submit') : t('auth.setup.submit')}
            </Button>
        </form>
    );
}
