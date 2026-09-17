import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

import App from '../App';
import ChangePasswordScreen from '../features/auth/ui/ChangePasswordScreen';
import LoginScreen from '../features/auth/ui/LoginScreen';
import RecoveryCodeScreen from '../features/auth/ui/RecoveryCodeScreen';
import SetupScreen from '../features/auth/ui/SetupScreen';
import CustomTitleBar from '../shared/components/CustomTitleBar';
import { ToastViewport, useGlobalAccessErrors } from '../shared/ui/toast';
import { useSessionStore } from '../stores/sessionStore';

/** Chooses what to show from the session state held by the main process. */
export function Main() {
    const status = useSessionStore((s) => s.status);
    const pendingRecoveryCode = useSessionStore((s) => s.pendingRecoveryCode);
    const init = useSessionStore((s) => s.init);

    useGlobalAccessErrors();

    useEffect(() => {
        void init();
    }, [init]);

    let content;
    switch (status) {
        case 'loading':
            content = (
                <div className="flex h-screen items-center justify-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            );
            break;
        case 'setup':
            content = <SetupScreen />;
            break;
        case 'login':
            content = <LoginScreen />;
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
            <CustomTitleBar />
            {content}
            <ToastViewport />
        </>
    );
}
