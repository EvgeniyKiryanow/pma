import { useEffect, useState } from 'react';
import LoginPage from './Pages/LogIn';
import RegisterPage from './Pages/RegisterPage';
import ForgotPasswordPage from './Pages/ForgotPasswordPage';
import App from './App';

export function Main() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [hasUser, setHasUser] = useState<boolean | null>(null);
    const [showForgot, setShowForgot] = useState(false);

    useEffect(() => {
        window.electronAPI.hasUser().then(setHasUser);
    }, []);

    if (hasUser === null) return <div>Loading...</div>;

    if (!isLoggedIn) {
        if (showForgot) {
            return (
                <ForgotPasswordPage
                    onReset={() => setShowForgot(false)}
                    onBackToLogin={() => setShowForgot(false)}
                />
            );
        }

        return hasUser ? (
            <LoginPage
                onLoginSuccess={() => setIsLoggedIn(true)}
                onForgotPassword={() => setShowForgot(true)}
            />
        ) : (
            <RegisterPage onRegisterSuccess={() => setIsLoggedIn(true)} />
        );
    }

    return <App />;
}
