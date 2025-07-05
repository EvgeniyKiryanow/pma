import BackupControls from '../components/BackupControls';
import { useState } from 'react';

export default function BackupPanel() {
    const [activeTab, setActiveTab] = useState<'settings' | 'actions'>('actions');

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-48 bg-gray-100 border-r p-4 space-y-2">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Backup Panel</h2>
                <button
                    onClick={() => setActiveTab('actions')}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-200 ${
                        activeTab === 'actions' ? 'bg-gray-200 font-medium' : ''
                    }`}
                >
                    Backup & Restore
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-200 ${
                        activeTab === 'settings' ? 'bg-gray-200 font-medium' : ''
                    }`}
                >
                    Auto Backup Settings
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {activeTab === 'actions' && (
                    <div className="max-w-xl mx-auto space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Backup & Restore</h2>
                            <p className="text-sm text-gray-600 mt-2">
                                Use the options below to download a backup or restore from one.
                                Restoring a backup will <strong>overwrite current data</strong>.
                            </p>
                        </div>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={async () => {
                                    const success = await window.electronAPI.downloadDb();
                                    alert(success ? '✅ Backup saved!' : '❌ Backup failed!');
                                }}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow"
                            >
                                Download Backup
                            </button>
                            <button
                                onClick={async () => {
                                    const success = await window.electronAPI.restoreDb();
                                    alert(
                                        success
                                            ? '✅ Restored! Please restart.'
                                            : '❌ Restore failed.',
                                    );
                                    if (success) window.location.reload();
                                }}
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded shadow"
                            >
                                Restore Backup
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            Auto Backup Settings
                        </h2>
                        <BackupControls />
                    </div>
                )}
            </div>
        </div>
    );
}
