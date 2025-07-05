import { useState } from 'react';
import BackupControls from '../components/BackupControls';
import { useI18nStore } from '../stores/i18nStore';

export default function BackupPanel() {
    const [activeTab, setActiveTab] = useState<'settings' | 'actions'>('actions');
    const { t } = useI18nStore();

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-48 bg-gray-100 border-r p-4 space-y-2">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    {t('backupPanel.title')}
                </h2>
                <button
                    onClick={() => setActiveTab('actions')}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-200 ${
                        activeTab === 'actions' ? 'bg-gray-200 font-medium' : ''
                    }`}
                >
                    {t('backupPanel.actions')}
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-200 ${
                        activeTab === 'settings' ? 'bg-gray-200 font-medium' : ''
                    }`}
                >
                    {t('backupPanel.settings')}
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {activeTab === 'actions' && (
                    <div className="max-w-xl mx-auto space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">
                                {t('backupPanel.actions')}
                            </h2>
                            <p className="text-sm text-gray-600 mt-2">
                                {t('backupPanel.instructions')}
                            </p>
                        </div>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={async () => {
                                    const success = await window.electronAPI.downloadDb();
                                    alert(
                                        success
                                            ? t('backupPanel.backupSuccess')
                                            : t('backupPanel.backupFail'),
                                    );
                                }}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow"
                            >
                                {t('backupPanel.download')}
                            </button>
                            <button
                                onClick={async () => {
                                    const success = await window.electronAPI.restoreDb();
                                    alert(
                                        success
                                            ? t('backupPanel.restoreSuccess')
                                            : t('backupPanel.restoreFail'),
                                    );
                                    if (success) window.location.reload();
                                }}
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded shadow"
                            >
                                {t('backupPanel.restore')}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            {t('backupPanel.settings')}
                        </h2>
                        <BackupControls />
                    </div>
                )}
            </div>
        </div>
    );
}
