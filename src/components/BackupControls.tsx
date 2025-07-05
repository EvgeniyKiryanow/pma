import { useEffect, useState } from 'react';

const INTERVAL_OPTIONS = [1, 3, 5, 7, 10, 30];

export default function BackupControls() {
    const [intervalDays, setIntervalDays] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedMessage, setLastSavedMessage] = useState('');
    const [autoBackupDir, setAutoBackupDir] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const current = await window.electronAPI.getBackupIntervalInDays();
                setIntervalDays(current || 1);

                const path = await window.electronAPI.getBackupPath();
                if (path) {
                    setAutoBackupDir(`${path}`);
                }
            } catch (err) {
                console.error('Failed to fetch backup interval or path:', err);
            }
        };

        fetchInitialData();
    }, []);

    const handleDownload = async () => {
        const success = await window.electronAPI.downloadDb();
        alert(success ? '✅ Backup saved successfully!' : '❌ Backup failed!');
    };

    const handleRestore = async () => {
        const success = await window.electronAPI.restoreDb();
        alert(
            success
                ? '✅ Database restored successfully! Please restart the app.'
                : '❌ Restore failed!',
        );
        if (success) window.location.reload();
    };

    const handleSaveInterval = async () => {
        setIsSaving(true);
        try {
            await window.electronAPI.setBackupIntervalInDays(intervalDays);
            setLastSavedMessage(`✔ Auto-backup every ${intervalDays} day(s) saved.`);
        } catch {
            setLastSavedMessage('❌ Failed to save interval.');
        } finally {
            setIsSaving(false);
            setTimeout(() => setLastSavedMessage(''), 3000);
        }
    };

    return (
        <div className="max-w-lg mx-auto p-6 bg-white rounded shadow border space-y-6">
            <h2 className="text-lg font-semibold text-gray-800">Backup Controls</h2>

            <div className="flex gap-3">
                <button
                    onClick={handleDownload}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow"
                >
                    Download Backup
                </button>
                <button
                    onClick={handleRestore}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow"
                >
                    Restore Backup
                </button>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto-backup frequency
                </label>
                <div className="flex items-center gap-2">
                    <select
                        value={intervalDays}
                        onChange={(e) => setIntervalDays(Number(e.target.value))}
                        className="px-3 py-1 border rounded"
                    >
                        {INTERVAL_OPTIONS.map((day) => (
                            <option key={day} value={day}>
                                Every {day} day{day > 1 ? 's' : ''}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={handleSaveInterval}
                        disabled={isSaving}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-60"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
                {lastSavedMessage && (
                    <p className="mt-2 text-sm text-green-600">{lastSavedMessage}</p>
                )}
            </div>

            {autoBackupDir && (
                <div className="text-xs text-gray-500">
                    <span className="font-medium">Auto-backup location:</span>
                    <br />
                    <code className="break-all text-[10px]">{autoBackupDir}</code>
                </div>
            )}
        </div>
    );
}
