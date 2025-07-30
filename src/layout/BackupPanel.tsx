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
                                        placeholder="Пароль (мін. 6 символів)"
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
                                                const password = passwordInput.trim();

                                                if (password.length < 6) {
                                                    alert(
                                                        'Пароль занадто короткий. Мінімум 6 символів.',
                                                    );
                                                    return;
                                                }

                                                setShowPasswordModal(null);
                                                setPasswordInput('');

                                                try {
                                                    if (showPasswordModal === 'export') {
                                                        await window.electronAPI.exportChangeLogs(
                                                            password,
                                                        );
                                                        alert(t('backupPanel.exportSuccess'));
                                                    } else {
                                                        const result =
                                                            await window.electronAPI.importChangeLogs(
                                                                password,
                                                            );

                                                        if (result?.error === 'invalid-password') {
                                                            alert(
                                                                'Невірний пароль. Спробуйте ще раз.',
                                                            );
                                                            setShowPasswordModal('import');
                                                            return;
                                                        }

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

                {/* Логи успішно імпортовано */}
            </div>
        </div>
    );
}
