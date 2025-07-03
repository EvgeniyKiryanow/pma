import { useState } from 'react';

type LoginPageProps = {
    onLoginSuccess: () => void;
};

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (username === 'admin' && password === 'admin') {
            onLoginSuccess();
        } else {
            setError('Invalid username or password');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-80">
                <h2 className="text-xl font-semibold mb-4">Login</h2>

                <input
                    type="text"
                    placeholder="Username"
                    className="w-full mb-3 px-3 py-2 border rounded"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                />

                <input
                    type="password"
                    placeholder="Password"
                    className="w-full mb-3 px-3 py-2 border rounded"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error && <p className="text-red-600 mb-3">{error}</p>}

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                >
                    Log In
                </button>
            </form>
        </div>
    );
}
