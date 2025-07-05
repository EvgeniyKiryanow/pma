export default function BackupPanel() {
    const handleRestore = async () => {
        const success = await window.electronAPI.restoreDb();
        alert(success ? 'Database restored!' : 'Restore failed!');
        window.location.reload();
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="max-w-xl text-center space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Backup & Restore</h2>
                    <p className="text-sm text-gray-600 mt-2">
                        Use the options below to save a backup of your current database or restore
                        from an existing one. Restoring a backup will{' '}
                        <strong>overwrite your current data</strong>.
                    </p>
                </div>

                <div className="flex justify-center gap-4">
                    <button
                        onClick={async () => {
                            const success = await window.electronAPI.downloadDb();
                            alert(success ? 'Backup saved successfully!' : 'Backup failed!');
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow"
                    >
                        Download Backup
                    </button>
                    <button
                        onClick={handleRestore}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded shadow"
                    >
                        Restore Backup
                    </button>
                </div>
            </div>
        </div>
    );
}
