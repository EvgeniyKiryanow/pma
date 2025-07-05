import { X, RotateCcw, Upload, Trash2 } from 'lucide-react';

export default function CustomTitleBar() {
    const handleRestore = async () => {
        const success = await window.electronAPI.restoreDb();
        if (success) {
            window.location.reload();
        } else {
            alert('Restore failed. Try again.');
        }
    };

    const handleResetDb = async () => {
        const confirm = window.confirm(
            'Are you sure you want to reset the app?\nThis will delete all users and data!',
        );
        if (!confirm) return;

        const success = await window.electronAPI.resetDb();
        if (success) {
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
            <div className="text-sm font-semibold">Control Panel Manager</div>

            <div
                className="flex gap-2"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                <button
                    className="p-1 hover:bg-green-600 rounded"
                    title="Restore Backup"
                    onClick={handleRestore}
                >
                    <Upload className="w-4 h-4" />
                </button>

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
