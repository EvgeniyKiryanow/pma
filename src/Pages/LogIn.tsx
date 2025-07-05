import { useEffect, useState } from 'react';
import { Lock, UserCircle2, Info, HelpCircle } from 'lucide-react';

type LoginPageProps = {
    onLoginSuccess: () => void;
    onForgotPassword: () => void;
};

export default function LoginPage({ onLoginSuccess, onForgotPassword }: LoginPageProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [hint, setHint] = useState('');
    const [error, setError] = useState('');
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkIfUserExists = async () => {
            try {
                const exists = await window.electronAPI.hasUser();
                setIsRegisterMode(!exists);
            } catch (err) {
                console.error('Error checking user existence:', err);
                setError('Failed to connect to database');
            } finally {
                setChecking(false);
            }
        };
        checkIfUserExists();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isRegisterMode) {
                await window.electronAPI.register(username, password, hint);
                onLoginSuccess();
            } else {
                const success = await window.electronAPI.login(username, password);
                if (success) {
                    onLoginSuccess();
                } else {
                    setError('Invalid username or password');
                }
            }
        } catch (err) {
            console.error(err);
            setError('Something went wrong. Please try again.');
        }
    };

    if (checking) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <p className="text-gray-500 text-sm">Checking user status...</p>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 px-4">
            <form
                onSubmit={handleSubmit}
                className="bg-white shadow-xl rounded-lg p-8 w-full max-w-sm border"
            >
                <div className="text-center mb-6">
                    <UserCircle2 className="w-12 h-12 mx-auto text-blue-600" />
                    <h2 className="text-xl font-bold text-gray-800 mt-2">
                        {isRegisterMode ? 'Register Admin' : 'Welcome Back'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {isRegisterMode
                            ? 'Create the first administrator account'
                            : 'Please log in to continue'}
                    </p>
                </div>

                {error && (
                    <p className="text-sm text-red-600 bg-red-100 border border-red-200 p-2 rounded mb-4">
                        {error}
                    </p>
                )}

                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                        autoFocus
                    />
                </div>

                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                    />
                </div>

                {isRegisterMode && (
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex gap-1 items-center">
                            <Info className="w-4 h-4 text-blue-500" />
                            Recovery Hint
                        </label>
                        <input
                            type="text"
                            value={hint}
                            onChange={(e) => setHint(e.target.value)}
                            placeholder="E.g. Your pet's name"
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                        />
                    </div>
                )}

                {!isRegisterMode && (
                    <div className="text-right text-xs text-blue-600 hover:underline mb-4">
                        <button
                            type="button"
                            onClick={onForgotPassword}
                            className="flex items-center gap-1"
                        >
                            <HelpCircle className="w-4 h-4" />
                            Forgot password?
                        </button>
                    </div>
                )}

                <button
                    type="submit"
                    className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition"
                >
                    <div className="flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" />
                        <span>{isRegisterMode ? 'Register' : 'Log In'}</span>
                    </div>
                </button>
            </form>
        </div>
    );
}
