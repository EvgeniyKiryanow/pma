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
        // ✅ Check if a token was temporarily saved during restore
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
                    <p className="text-sm text-gray-500">Loading...</p>
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
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white text-center py-2 text-sm shadow-md">
            Made by{' '}
            <a
                href="https://www.linkedin.com/in/yevhenii-kirianov-54b8081ba/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-300"
            >
                Evgeniy Kiriyanov
            </a>
            . If you have any suggestions or improvements — I’m happy to review your
            proposition!{' '}
        </footer>
    );
}
