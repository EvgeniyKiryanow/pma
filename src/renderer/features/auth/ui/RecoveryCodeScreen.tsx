import { Button } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { useSessionStore } from '../../../stores/sessionStore';
import AuthLayout from './AuthLayout';
import RecoveryCodeDisplay from './RecoveryCodeDisplay';

/** Shown once after the first administrator is created. */
export default function RecoveryCodeScreen({ code }: { code: string }) {
    const { t } = useI18nStore();
    const acknowledge = useSessionStore((s) => s.acknowledgeRecoveryCode);

    return (
        <AuthLayout title={t('auth.recoveryCode.title')} width="max-w-lg">
            <RecoveryCodeDisplay code={code} />
            <Button className="mt-6 w-full" onClick={acknowledge}>
                {t('auth.recoveryCode.confirm')}
            </Button>
        </AuthLayout>
    );
}
