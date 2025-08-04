import { useEffect, useState } from 'react';
import LoginPage from './Pages/LogIn';
import RegisterPage from './Pages/RegisterPage';
import ForgotPasswordPage from './Pages/ForgotPasswordPage';
import App from './App';
import CustomTitleBar from './components/CustomTitleBar';
import { useI18nStore } from './stores/i18nStore';

export function Main() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const { t } = useI18nStore();

    useEffect(() => {
        const token =
            localStorage.getItem('authToken') || sessionStorage.getItem('restoredAuthToken');
        if (token) {
            localStorage.setItem('authToken', token);
            sessionStorage.removeItem('restoredAuthToken');
            setIsLoggedIn(true);
        }

        window.electronAPI.onClearToken(() => {
            localStorage.removeItem('authToken');
            setIsLoggedIn(false);
            setMode('login');
        });
    }, []);

    return (
        <>
            <CustomTitleBar />
            {!isLoggedIn ? (
                mode === 'forgot' ? (
                    <ForgotPasswordPage
                        onReset={() => setMode('login')}
                        onBackToLogin={() => setMode('login')}
                    />
                ) : mode === 'login' ? (
                    <LoginPage
                        onLoginSuccess={() => {
                            localStorage.setItem('authToken', crypto.randomUUID());
                            setIsLoggedIn(true);
                        }}
                        onForgotPassword={() => setMode('forgot')}
                        onSwitchToRegister={() => setMode('register')}
                    />
                ) : (
                    <RegisterPage
                        onRegisterSuccess={() => {
                            localStorage.setItem('authToken', crypto.randomUUID());
                            setIsLoggedIn(true);
                        }}
                        onSwitchToLogin={() => setMode('login')}
                    />
                )
            ) : (
                <App />
            )}
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
