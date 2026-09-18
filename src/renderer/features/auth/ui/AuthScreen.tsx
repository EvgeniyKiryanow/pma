import { DatabaseBackup, LogIn, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Tabs } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { useSessionStore } from '../../../stores/sessionStore';
import { useOpenedBackupStore } from '../../backup/model/openedBackup';
import RestoreBackupFlow from '../../backup/ui/RestoreBackupFlow';
import AuthLayout from './AuthLayout';
import LoginForm from './LoginForm';
import NewAccountForm from './NewAccountForm';

export type AuthTab = 'login' | 'create' | 'restore';

/**
 * Everything before entering the application, always as the same three tabs: sign in,
 * a new account (first run, or starting over when every password is forgotten) and restore
 * from a backup. The last two do not depend on remembering any PManager password.
 */
export default function AuthScreen() {
    const { t } = useI18nStore();
    const hasAccounts = useSessionStore((s) => s.status) !== 'setup';
    // Opened with a backup file: go straight to restoring it.
    const openedBackup = useOpenedBackupStore((s) => s.name);
    const [tab, setTab] = useState<AuthTab>(() =>
        openedBackup ? 'restore' : hasAccounts ? 'login' : 'create',
    );
    useEffect(() => {
        if (openedBackup) setTab('restore');
    }, [openedBackup]);

    const heading: Record<AuthTab, { title: string; subtitle: string }> = {
        login: { title: t('auth.login.title'), subtitle: t('auth.login.subtitle') },
        create: hasAccounts
            ? { title: t('auth.startOver.title'), subtitle: t('auth.startOver.subtitle') }
            : { title: t('auth.setup.title'), subtitle: t('auth.setup.subtitle') },
        restore: { title: t('auth.restoreTab.title'), subtitle: t('auth.restoreTab.subtitle') },
    };

    return (
        <AuthLayout title={heading[tab].title} subtitle={heading[tab].subtitle} width="max-w-xl">
            <Tabs
                value={tab}
                onChange={setTab}
                className="-mx-6 -mt-6 mb-6 border-b border-line px-3"
                items={[
                    { value: 'login', label: t('auth.tabs.login'), icon: <LogIn /> },
                    { value: 'create', label: t('auth.tabs.create'), icon: <UserPlus /> },
                    { value: 'restore', label: t('auth.tabs.restore'), icon: <DatabaseBackup /> },
                ]}
            />
            {tab === 'login' && <LoginForm hasAccounts={hasAccounts} onTab={setTab} />}
            {tab === 'create' && <NewAccountForm hasAccounts={hasAccounts} />}
            {tab === 'restore' && <RestoreBackupFlow />}
        </AuthLayout>
    );
}
