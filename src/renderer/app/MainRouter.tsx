import { useEffect } from 'react';

import App from '../App';
import AuthScreen from '../features/auth/ui/AuthScreen';
import ChangePasswordScreen from '../features/auth/ui/ChangePasswordScreen';
import RecoveryCodeScreen from '../features/auth/ui/RecoveryCodeScreen';
import { useOpenedBackupStore, watchOpenedBackups } from '../features/backup/model/openedBackup';
import CustomTitleBar from '../shared/components/CustomTitleBar';
import LogoSvg from '../shared/icons/LogoSvg';
import { BlockingTaskHost } from '../shared/ui/blockingTask';
import { ConfirmHost } from '../shared/ui/confirm';
import { PageLoader } from '../shared/ui/loader';
import { ToastViewport } from '../shared/ui/toast';
import { usePermissions, useSessionStore } from '../stores/sessionStore';
import { useNavLayout } from '../stores/uiStore';
import { useUserStore } from '../stores/userStore';
import { SectionCrumb, ShellAlerts } from './layout/ShellChrome';

/** Chooses what to show from the session state held by the main process. */
export function Main() {
    const status = useSessionStore((s) => s.status);
    const pendingRecoveryCode = useSessionStore((s) => s.pendingRecoveryCode);
    const init = useSessionStore((s) => s.init);
    const nav = useNavLayout();

    useEffect(() => {
        void init();
        watchOpenedBackups();
    }, [init]);

    // A .pmb file opened with the program: once signed in, go to restoring it.
    const openedBackup = useOpenedBackupStore((s) => s.name);
    const { can } = usePermissions();
    const canImport = can('backup.import');
    useEffect(() => {
        if (openedBackup && status === 'ready' && canImport) {
            useUserStore.getState().setCurrentTab('backups');
        }
    }, [openedBackup, status, canImport]);

    const inApp = status === 'ready' && !pendingRecoveryCode;

    let content;
    switch (status) {
        case 'loading':
            // No delay: this is the first thing the window shows, it must never be blank.
            content = (
                <PageLoader
                    fullScreen
                    delay={0}
                    className="pt-10"
                    emblem={<LogoSvg className="size-14" />}
                />
            );
            break;
        // One screen for both, so its tab stays put while starting over switches the status.
        case 'setup':
        case 'login':
            content = <AuthScreen />;
            break;
        case 'change-password':
            content = <ChangePasswordScreen />;
            break;
        case 'ready':
            content = pendingRecoveryCode ? (
                <RecoveryCodeScreen code={pendingRecoveryCode} />
            ) : (
                <App />
            );
            break;
    }

    return (
        <>
            <CustomTitleBar
                brandWidth={inApp ? nav.width : undefined}
                leading={inApp ? <SectionCrumb /> : null}
                trailing={inApp ? <ShellAlerts /> : null}
            />
            {content}
            <ToastViewport />
            <ConfirmHost />
            <BlockingTaskHost />
        </>
    );
}
