import { useState } from 'react';
import BackupControls from '../components/BackupControls';
import { useI18nStore } from '../stores/i18nStore';

export default function BackupPanel() {
    const [activeTab, setActiveTab] = useState<'settings' | 'actions' | 'changeLogs'>('actions');
    const [showPasswordModal, setShowPasswordModal] = useState<null | 'export' | 'import'>(null);
    const [passwordInput, setPasswordInput] = useState('');

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
                <button
                    onClick={() => setActiveTab('changeLogs')}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-200 ${
                        activeTab === 'changeLogs' ? 'bg-gray-200 font-medium' : ''
                    }`}
                >
                    {t('backupPanel.changeLogs')}
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

                {activeTab === 'changeLogs' && (
                    <div className="max-w-xl mx-auto space-y-6">
                        <h2 className="text-2xl font-bold text-gray-800">
                            {t('backupPanel.changeLogs')}
                        </h2>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setShowPasswordModal('export')}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
                            >
                                {t('backupPanel.exportChangeLogs')}
                            </button>

                            <button
                                onClick={() => setShowPasswordModal('import')}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded shadow"
                            >
                                {t('backupPanel.importChangeLogs')}
                            </button>
                        </div>

                        {showPasswordModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                                <div className="bg-white p-6 rounded shadow-md max-w-sm w-full">
                                    <h2 className="text-lg font-semibold mb-4">
                                        {showPasswordModal === 'export'
                                            ? 'Введіть пароль для шифрування логів'
                                            : 'Введіть пароль для розшифрування логів'}
                                    </h2>
                                    <input
                                        type="password"
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        className="w-full border rounded p-2 mb-4"
                                        placeholder="Пароль"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setShowPasswordModal(null);
                                                setPasswordInput('');
                                            }}
                                            className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400"
                                        >
                                            Скасувати
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const password = passwordInput;
                                                setShowPasswordModal(null);
                                                setPasswordInput('');

                                                if (!password) return;

                                                try {
                                                    if (showPasswordModal === 'export') {
                                                        await window.electronAPI.exportChangeLogs(
                                                            password,
                                                        );
                                                        alert(t('backupPanel.exportSuccess'));
                                                    } else {
                                                        await window.electronAPI.importChangeLogs(
                                                            password,
                                                        );
                                                        alert(t('backupPanel.importSuccess'));
                                                    }
                                                } catch {
                                                    alert(
                                                        showPasswordModal === 'export'
                                                            ? t('backupPanel.exportFail')
                                                            : t('backupPanel.importFail'),
                                                    );
                                                }
                                            }}
                                            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            OK
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
