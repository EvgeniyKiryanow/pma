import DefaultAdminPanel from '@pages/DefaultAdminPanel';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import App from './App';
import CustomTitleBar from './components/CustomTitleBar';
import ForgotPasswordPage from './Pages/ForgotPasswordPage';
import LoginPage from './Pages/LogIn';
import RegisterPage from './Pages/RegisterPage';
import { useI18nStore } from './stores/i18nStore';

export function Main() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const { t } = useI18nStore();
    const location = useLocation();

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

            <Routes>
                {!isLoggedIn ? (
                    <>
                        <Route
                            path="/login"
                            element={
                                <LoginPage
                                    onLoginSuccess={() => {
                                        localStorage.setItem('authToken', crypto.randomUUID());
                                        setIsLoggedIn(true);
                                    }}
                                    onForgotPassword={() => setMode('forgot')}
                                    onSwitchToRegister={() => setMode('register')}
                                />
                            }
                        />
                        <Route
                            path="/register"
                            element={
                                <RegisterPage
                                    onRegisterSuccess={() => {
                                        localStorage.setItem('authToken', crypto.randomUUID());
                                        setIsLoggedIn(true);
                                    }}
                                    onSwitchToLogin={() => setMode('login')}
                                />
                            }
                        />
                        <Route
                            path="/forgot"
                            element={
                                <ForgotPasswordPage
                                    onReset={() => setMode('login')}
                                    onBackToLogin={() => setMode('login')}
                                />
                            }
                        />
                        <Route path="*" element={<Navigate to="/login" />} />
                    </>
                ) : (
                    <>
                        <Route path="/default-admin" element={<DefaultAdminPanel />} />
                        <Route path="/*" element={<App />} />
                    </>
                )}
            </Routes>
        </>
    );
}
