import { useEffect, useState } from 'react';
import { X, RotateCcw, Upload, Trash2, Download } from 'lucide-react';

export default function CustomTitleBar() {
    const [version, setVersion] = useState('');
    const [checking, setChecking] = useState(false);
    const [hasUser, setHasUser] = useState<boolean | null>(null);

    useEffect(() => {
        window.electronAPI.getAppVersion().then(setVersion);
        window.electronAPI.hasUser().then(setHasUser);
    }, []);

    const handleCheckUpdate = async () => {
        setChecking(true);
        const result = await window.electronAPI.checkForUpdates();
        setChecking(false);

        if (result.status === 'error') {
            alert('Error checking for updates: ' + result.message);
        } else {
            alert('Update check started. If a new version is found, it will be downloaded.');
        }
    };

    const handleRestore = async () => {
        if (!hasUser) {
            alert('You must have a registered user to restore a backup.');
            return;
        }

        const success = await window.electronAPI.restoreDb();
        if (success) window.location.reload();
        else alert('Restore failed. Try again.');
    };

    const handleResetDb = async () => {
        const confirm = window.confirm(
            'Are you sure you want to reset the app?\nThis will delete all users and data!',
        );
        if (!confirm) return;

        const success = await window.electronAPI.resetDb();
        if (success) {
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('authToken');

            alert('App has been reset. Restarting...');
            window.location.reload();
        } else {
            alert('Failed to reset database.');
        }
    };

    return (
        <div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-gray-800 text-white select-none shadow-md"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            <div className="flex items-center gap-4 text-sm font-semibold">
                <span>Control Panel Manager</span>
                {version && <span className="text-gray-400">v{version}</span>}
            </div>

            <div
                className="flex gap-2"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                {/* <button
                    className="p-1 hover:bg-blue-600 rounded"
                    title="Check for updates"
                    onClick={handleCheckUpdate}
                >
                    <Download className="w-4 h-4" />
                </button> */}

                {hasUser && (
                    <button
                        className={`p-1 rounded ${hasUser ? 'hover:bg-green-600' : 'opacity-50 cursor-not-allowed'}`}
                        title={'Restore Backup'}
                        onClick={handleRestore}
                    >
                        <Upload className="w-4 h-4" />
                    </button>
                )}

                <button
                    className="p-1 hover:bg-yellow-600 rounded"
                    title="Reset App"
                    onClick={handleResetDb}
                >
                    <Trash2 className="w-4 h-4" />
                </button>

                <button
                    className="p-1 hover:bg-gray-600 rounded"
                    title="Reload"
                    onClick={() => window.location.reload()}
                >
                    <RotateCcw className="w-4 h-4" />
                </button>

                <button
                    className="p-1 hover:bg-red-500 rounded"
                    title="Close"
                    onClick={() => window.close()}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
