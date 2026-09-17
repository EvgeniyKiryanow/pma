import { KeyRound, RefreshCw } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { errorMessage, unwrap } from '../../../shared/api/call';
import { Alert, Button, Modal, PasswordField } from '../../../shared/ui';
import { toast } from '../../../shared/ui/toast';
import { useI18nStore } from '../../../stores/i18nStore';
import { useSessionStore } from '../../../stores/sessionStore';
import ChangePasswordForm from '../../auth/ui/ChangePasswordForm';
import RecoveryCodeDisplay from '../../auth/ui/RecoveryCodeDisplay';

/** Available to every signed-in user: own password and recovery code. */
export default function MyAccountDialog({ onClose }: { onClose: () => void }) {
    const { t } = useI18nStore();
    const session = useSessionStore((s) => s.session);
    const refresh = useSessionStore((s) => s.refresh);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newCode, setNewCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    if (!session) return null;

    const regenerate = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setBusy(true);
        try {
            setNewCode(
                await unwrap(window.electronAPI.auth.regenerateRecoveryCode(currentPassword)),
            );
            setCurrentPassword('');
            await refresh();
        } catch (err) {
            setError(errorMessage(err, t));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={`${t('admin.security.title')}: ${session.username}`}
            width="max-w-xl"
        >
            <div className="space-y-6">
                <section>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <KeyRound className="h-4 w-4" />
                        {t('admin.security.changePassword')}
                    </h4>
                    <ChangePasswordForm
                        onChanged={() => toast.success(t('admin.security.passwordChanged'))}
                    />
                </section>

                <section className="border-t pt-5">
                    <h4 className="mb-3 text-sm font-semibold text-gray-900">
                        {t('admin.security.recoveryTitle')}
                    </h4>
                    {newCode ? (
                        <RecoveryCodeDisplay code={newCode} />
                    ) : (
                        <form onSubmit={regenerate} className="space-y-3">
                            <Alert tone={session.hasRecoveryCode ? 'info' : 'warning'}>
                                {session.hasRecoveryCode
                                    ? t('admin.security.recoveryActive')
                                    : t('admin.security.recoveryMissing')}
                            </Alert>
                            {error && <Alert tone="error">{error}</Alert>}
                            <div className="flex flex-wrap items-end gap-3">
                                <PasswordField
                                    className="min-w-[220px] flex-1"
                                    label={t('admin.security.currentPassword')}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                />
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    loading={busy}
                                    icon={<RefreshCw className="h-4 w-4" />}
                                >
                                    {t('admin.security.regenerate')}
                                </Button>
                            </div>
                        </form>
                    )}
                </section>
            </div>
        </Modal>
    );
}
