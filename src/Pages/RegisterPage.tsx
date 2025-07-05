import { useState } from 'react';

export default function RegisterPage({ onRegisterSuccess }: { onRegisterSuccess: () => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [recoveryHint, setRecoveryHint] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await window.electronAPI.register(username, password, recoveryHint);
            onRegisterSuccess();
        } catch (err) {
            console.error(err);
            setError('Failed to register user');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-100 to-blue-100 px-4">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-96">
                <h2 className="text-xl font-semibold mb-6 text-center text-blue-700">
                    Register Account
                </h2>

                {error && <p className="text-red-600 mb-3">{error}</p>}

                <input
                    type="text"
                    placeholder="Username"
                    className="w-full mb-3 px-3 py-2 border rounded"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="w-full mb-3 px-3 py-2 border rounded"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Recovery Hint (used for password reset)"
                    className="w-full mb-4 px-3 py-2 border rounded"
                    value={recoveryHint}
                    onChange={(e) => setRecoveryHint(e.target.value)}
                    required
                />

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                >
                    Register
                </button>
            </form>
        </div>
    );
}
