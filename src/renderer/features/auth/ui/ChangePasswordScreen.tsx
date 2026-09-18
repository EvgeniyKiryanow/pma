import { LogOut } from 'lucide-react';

import { useI18nStore } from '../../../stores/i18nStore';
import { useSessionStore } from '../../../stores/sessionStore';
import AuthLayout from './AuthLayout';
import ChangePasswordForm from './ChangePasswordForm';

/** Blocking screen when an administrator issued a temporary password. */
export default function ChangePasswordScreen() {
    const { t } = useI18nStore();
    const logout = useSessionStore((s) => s.logout);

    return (
        <AuthLayout
            title={t('auth.changePassword.title')}
            subtitle={t('auth.changePassword.required')}
        >
            <ChangePasswordForm />
            <div className="mt-4 text-center">
                <button
                    type="button"
                    onClick={() => void logout()}
                    className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink"
                >
                    <LogOut className="h-4 w-4" />
                    {t('session.logout')}
                </button>
            </div>
        </AuthLayout>
    );
}
