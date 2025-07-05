export default function BackupControls() {
    const handleDownload = async () => {
        const success = await window.electronAPI.downloadDb();
        alert(success ? 'Backup saved successfully!' : 'Backup failed!');
    };

    const handleRestore = async () => {
        const success = await window.electronAPI.restoreDb();
        alert(success ? 'Database restored successfully! Please restart the app.' : 'Restore failed!');
        if (success) {
            window.location.reload(); // Optional: reload app to apply restored DB
        }
    };

    return (
        <div className="flex gap-2">
            <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow"
            >
                Download Backup
            </button>
            <button
                onClick={handleRestore}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow"
            >
                Restore Backup
            </button>
        </div>
    );
}
