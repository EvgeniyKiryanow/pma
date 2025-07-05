import { useEffect, useState } from 'react';
import LoginPage from './Pages/LogIn';
import RegisterPage from './Pages/RegisterPage';
import ForgotPasswordPage from './Pages/ForgotPasswordPage';
import App from './App';
import CustomTitleBar from './components/CustomTitleBar';
import { useI18nStore } from './stores/i18nStore';

export function Main() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [hasUser, setHasUser] = useState<boolean | null>(null);
    const [showForgot, setShowForgot] = useState(false);
    const { t } = useI18nStore();

    useEffect(() => {
        const restoredToken = sessionStorage.getItem('restoredAuthToken');
        if (restoredToken) {
            localStorage.setItem('authToken', restoredToken);
            sessionStorage.removeItem('restoredAuthToken');
            setIsLoggedIn(true);
        } else {
            const token = localStorage.getItem('authToken');
            if (token) setIsLoggedIn(true);
        }

        window.electronAPI.hasUser().then(setHasUser);

        window.electronAPI.onClearToken(() => {
            localStorage.removeItem('authToken');
        });
    }, []);

    if (hasUser === null) {
        return (
            <>
                <CustomTitleBar />
                <div className="flex items-center justify-center min-h-screen bg-gray-100">
                    <p className="text-sm text-gray-500">{t('main.loading')}</p>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <CustomTitleBar />
            {!isLoggedIn ? (
                showForgot ? (
                    <ForgotPasswordPage
                        onReset={() => setShowForgot(false)}
                        onBackToLogin={() => setShowForgot(false)}
                    />
                ) : hasUser ? (
                    <LoginPage
                        onLoginSuccess={() => {
                            localStorage.setItem('authToken', crypto.randomUUID());
                            setIsLoggedIn(true);
                        }}
                        onForgotPassword={() => setShowForgot(true)}
                    />
                ) : (
                    <RegisterPage
                        onRegisterSuccess={() => {
                            localStorage.setItem('authToken', crypto.randomUUID());
                            setIsLoggedIn(true);
                        }}
                    />
                )
            ) : (
                <App />
            )}
            <Footer />
        </>
    );
}

function Footer() {
    const { t } = useI18nStore();

    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white text-center py-2 text-sm shadow-md">
            {t('main.madeBy')}{' '}
            <a
                href="https://www.linkedin.com/in/yevhenii-kirianov-54b8081ba/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-300"
            >
                Evgeniy Kiriyanov
            </a>
            . {t('main.improvements')}
        </footer>
    );
}
