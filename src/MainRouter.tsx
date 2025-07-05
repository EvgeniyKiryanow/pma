import { useEffect, useState } from 'react';
import LoginPage from './Pages/LogIn';
import RegisterPage from './Pages/RegisterPage';
import ForgotPasswordPage from './Pages/ForgotPasswordPage';
import App from './App';
import CustomTitleBar from './components/CustomTitleBar';

export function Main() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [hasUser, setHasUser] = useState<boolean | null>(null);
    const [showForgot, setShowForgot] = useState(false);

    useEffect(() => {
        window.electronAPI.hasUser().then(setHasUser);
    }, []);

    if (hasUser === null) {
        return (
            <>
                <CustomTitleBar />
                <div className="flex items-center justify-center min-h-screen bg-gray-100">
                    <p className="text-sm text-gray-500">Loading...</p>
                </div>
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
                        onLoginSuccess={() => setIsLoggedIn(true)}
                        onForgotPassword={() => setShowForgot(true)}
                    />
                ) : (
                    <RegisterPage onRegisterSuccess={() => setIsLoggedIn(true)} />
                )
            ) : (
                <App />
            )}
        </>
    );
}
