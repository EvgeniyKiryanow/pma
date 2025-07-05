import { useState } from 'react';
import { Lock, ShieldQuestion, RotateCcw, ArrowLeft } from 'lucide-react';

type ForgotPasswordPageProps = {
    onReset: () => void;
    onBackToLogin: () => void;
};

export default function ForgotPasswordPage({ onReset, onBackToLogin }: ForgotPasswordPageProps) {
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState('');
    const [hint, setHint] = useState('');
    const [answer, setAnswer] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');

    const fetchHint = async () => {
        try {
            const fetchedHint = await window.electronAPI.getRecoveryHint(username);
            if (!fetchedHint) {
                setError('User not found or no recovery hint.');
                return;
            }
            setHint(fetchedHint);
            setStep(2);
        } catch (err) {
            console.error(err);
            setError('Error retrieving recovery hint.');
        }
    };

    const verifyAndProceed = () => {
        if (answer.trim().toLowerCase() === hint.trim().toLowerCase()) {
            setStep(3);
            setError('');
        } else {
            setError('Incorrect answer to recovery hint.');
        }
    };

    const resetPassword = async () => {
        try {
            const success = await window.electronAPI.resetPassword(username, answer, newPassword);
            if (success) {
                alert('Password successfully reset!');
                onReset();
            } else {
                setError('Failed to reset password. Try again.');
            }
        } catch (err) {
            console.error(err);
            setError('Error resetting password.');
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 px-4">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm border relative">
                {/* Back to Login button */}
                <button
                    onClick={onBackToLogin}
                    className="absolute top-2 left-2 flex items-center text-sm text-blue-600 hover:underline"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Login
                </button>

                <div className="text-center mb-6 mt-4">
                    <RotateCcw className="w-10 h-10 text-blue-600 mx-auto" />
                    <h2 className="text-xl font-semibold mt-2 text-gray-800">Recover Password</h2>
                    <p className="text-sm text-gray-500">Follow the steps to reset your access</p>
                </div>

                {error && (
                    <p className="text-sm text-red-600 bg-red-100 border border-red-200 p-2 rounded mb-4">
                        {error}
                    </p>
                )}

                {step === 1 && (
                    <>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border rounded mb-4"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            autoFocus
                        />
                        <button
                            onClick={fetchHint}
                            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                        >
                            Next
                        </button>
                    </>
                )}

                {step === 2 && (
                    <>
                        <p className="text-sm text-gray-700 mb-2">
                            <ShieldQuestion className="inline-block w-4 h-4 mr-1 text-blue-500" />
                            <strong>Recovery Hint:</strong> {hint}
                        </p>
                        <input
                            type="text"
                            placeholder="Your answer"
                            className="w-full px-3 py-2 border rounded mb-4"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                        />
                        <button
                            onClick={verifyAndProceed}
                            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                        >
                            Verify Answer
                        </button>
                    </>
                )}

                {step === 3 && (
                    <>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                        </label>
                        <input
                            type="password"
                            placeholder="New password"
                            className="w-full px-3 py-2 border rounded mb-4"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                            onClick={resetPassword}
                            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Lock className="w-4 h-4" />
                                <span>Reset Password</span>
                            </div>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
