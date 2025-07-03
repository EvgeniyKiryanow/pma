import { useState } from 'react';
import LoginPage from './Pages/LogIn';
import App from './App';

export function Main() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    if (!isLoggedIn) {
        return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
    }

    return <App />;
}
