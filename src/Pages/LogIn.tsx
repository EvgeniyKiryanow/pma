import { useState } from 'react';
import { Lock, UserCircle2, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type LoginPageProps = {
    onLoginSuccess: () => void;
    onForgotPassword: () => void;
    onSwitchToRegister: () => void;
};

export default function LoginPage({
    onLoginSuccess,
    onForgotPassword,
    onSwitchToRegister,
}: LoginPageProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); // clear previous error

        try {
            const uname = username.trim().toLowerCase();

            if (uname === 'superuser') {
                const key = await window.electronAPI.superuserLogin(username, password);
                if (key) {
                    localStorage.setItem('authToken', key);
                    sessionStorage.setItem('role', 'superuser');
                    onLoginSuccess();
                    return;
                } else {
                    setError('Invalid superuser credentials');
                    return;
                }
            }

            if (uname === 'admin') {
                const key = await window.electronAPI.defaultAdminLogin(username, password);
                if (key) {
                    localStorage.setItem('authToken', key);
                    sessionStorage.setItem('role', 'admin');
                    onLoginSuccess();
                    return;
                } else {
                    setError('Invalid admin credentials');
                    return;
                }
            }

            const success = await window.electronAPI.login(username, password);
            if (success) {
                const token = crypto.randomUUID();
                localStorage.setItem('authToken', token);
                sessionStorage.setItem('role', 'user');
                onLoginSuccess();
            } else {
                setError('Invalid username or password');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Something went wrong. Please try again.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 px-4">
            <form
                onSubmit={handleSubmit}
                className="bg-white shadow-xl rounded-lg p-8 w-full max-w-sm border"
            >
                <div className="text-center mb-6">
                    <UserCircle2 className="w-12 h-12 mx-auto text-blue-600" />
                    <h2 className="text-xl font-bold text-gray-800 mt-2">Welcome Back</h2>
                    <p className="text-sm text-gray-500">Please log in to continue</p>
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

                <div className="text-right text-xs text-blue-600 hover:underline mb-4">
                    <button
                        type="button"
                        onClick={() => navigate('/forgot')}
                        className="flex items-center gap-1"
                    >
                        <HelpCircle className="w-4 h-4" />
                        Forgot password?
                    </button>
                </div>

                <button
                    type="submit"
                    className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition"
                >
                    <div className="flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" />
                        <span>Log In</span>
                    </div>
                </button>

                <p className="text-sm text-gray-500 mt-3 text-center">
                    Don&apos;t have an account?{' '}
                    <button
                        type="button"
                        className="text-blue-600 hover:underline"
                        onClick={() => navigate('/register')}
                    >
                        Register here
                    </button>
                </p>
            </form>
        </div>
    );
}
