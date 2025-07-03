export default function BackupControls() {
    const handleDownload = async () => {
        const success = await window.electronAPI.downloadDb();
        alert(success ? 'Backup saved successfully!' : 'Backup failed!');
    };

    return (
        <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow"
        >
            Download Backup
        </button>
    );
}
