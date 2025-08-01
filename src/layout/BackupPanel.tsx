import { useState } from 'react';
import BackupControls from '../components/BackupControls';
import { useI18nStore } from '../stores/i18nStore';

export default function BackupPanel() {
    const [activeTab, setActiveTab] = useState<'settings' | 'actions' | 'changeLogs'>('actions');
    const [showPasswordModalType, setShowPasswordModalType] = useState<
        null | 'export' | 'import' | 'export-db' | 'import-db'
    >(null);
    const [passwordInput, setPasswordInput] = useState('');

    const { t } = useI18nStore();
    const password = passwordInput.trim();
    const handlePasswordConfirm = async () => {
        if (password.length < 6) {
            alert('Пароль занадто короткий. Мінімум 6 символів.');
            return;
        }

        const type = showPasswordModalType;
        setShowPasswordModalType(null);
        setPasswordInput('');

        try {
            if (type === 'export') {
                await window.electronAPI.exportChangeLogs(password);
                alert(t('backupPanel.exportSuccess'));
            } else if (type === 'import') {
                const result = await window.electronAPI.importChangeLogs(password);
                if (result?.error === 'invalid-password') {
                    alert('Невірний пароль. Спробуйте ще раз.');
                    setShowPasswordModalType('import');
                    return;
                }
                alert(t('backupPanel.importSuccess'));
            } else if (type === 'export-db') {
                const success = await window.electronAPI.downloadDbSafe(password);
                alert(success ? 'Бекап успішно збережено' : 'Помилка при збереженні бекапу');
            } else if (type === 'import-db') {
                const success = await window.electronAPI.restoreDbSafe(password);
                alert(success ? 'Бекап успішно відновлено' : 'Помилка при відновленні бекапу');
                if (success) window.location.reload();
            }
        } catch {
            alert('Щось пішло не так. Спробуйте ще раз.');
        }
    };

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
                    <div className="max-w-xl mx-auto space-y-8">
                        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                💾 {t('backupPanel.actions')}
                            </h2>
                            <p className="text-gray-700 text-sm leading-relaxed">
                                Створюйте резервні копії бази даних вручну або відновлюйте дані при
                                потребі. Для додаткової безпеки також доступна функція{' '}
                                <strong>зашифрованого резервного копіювання</strong>, що дозволяє
                                захистити дані паролем.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                    🟢 Стандартне резервування
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Ці дії дозволяють зберегти або відновити базу даних без
                                    шифрування. Підходить для локального використання або тимчасових
                                    копій.
                                </p>
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
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow"
                                    >
                                        📥 {t('backupPanel.download')}
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
                                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow"
                                    >
                                        ♻️ {t('backupPanel.restore')}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                    🔐 Зашифровані резервні копії
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Використовуйте зашифровані резервні копії для захисту чутливих
                                    даних. Ви вказуєте пароль, який потрібен при імпорті на іншому
                                    пристрої.
                                </p>
                                <div className="flex justify-center gap-4">
                                    <button
                                        onClick={() => setShowPasswordModalType('export-db')}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow"
                                    >
                                        🔐 Експортувати
                                    </button>
                                    <button
                                        onClick={() => setShowPasswordModalType('import-db')}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow"
                                    >
                                        🔑 Імпортувати
                                    </button>
                                </div>
                            </div>
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
                        <div className="mb-6">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                {t('backupPanel.changeLogs')}
                            </h2>
                            <p className="text-gray-700 text-sm leading-relaxed">
                                Тут ви можете <strong>експортувати</strong> або{' '}
                                <strong>імпортувати</strong> зашифровані журнали змін...
                            </p>
                        </div>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setShowPasswordModalType('export')}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
                            >
                                {t('backupPanel.exportChangeLogs')}
                            </button>

                            <button
                                onClick={() => setShowPasswordModalType('import')}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded shadow"
                            >
                                {t('backupPanel.importChangeLogs')}
                            </button>
                        </div>
                    </div>
                )}

                {showPasswordModalType && (
                    <div className="fixed inset-0 z-50 bg-white bg-opacity-50 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
                                {showPasswordModalType.includes('export')
                                    ? 'Введіть пароль для шифрування'
                                    : 'Введіть пароль для розшифрування'}
                            </h2>

                            <input
                                type="password"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                                placeholder="Пароль (мін. 6 символів)"
                                autoFocus
                            />

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowPasswordModalType(null);
                                        setPasswordInput('');
                                    }}
                                    className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700"
                                >
                                    Скасувати
                                </button>
                                <button
                                    onClick={handlePasswordConfirm}
                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
