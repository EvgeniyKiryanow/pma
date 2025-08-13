import { useState } from 'react';

import { useI18nStore } from '../../../stores/i18nStore';

export default function BackupPanel() {
    //  const [activeTab, setActiveTab] = useState<'settings' | 'actions' | 'changeLogs'>('actions');
    const [activeTab, setActiveTab] = useState<'actions' | 'changeLogs'>('actions');
    const [showPasswordModalType, setShowPasswordModalType] = useState<
        null | 'export' | 'import' | 'download-db-safe' | 'restore-db-safe'
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
            } else if (type === 'download-db-safe') {
                await window.electronAPI.downloadDbSafe(password);
                alert('Зашифрований бекап збережено');
            } else if (type === 'restore-db-safe') {
                await window.electronAPI.restoreDbSafe(password);
                alert('Бекап успішно відновлено');
                window.location.reload();
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
                {/* <button
                    onClick={() => setActiveTab('settings')}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-200 ${
                        activeTab === 'settings' ? 'bg-gray-200 font-medium' : ''
                    }`}
                >
                    {t('backupPanel.settings')}
                </button> */}
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
                                        onClick={() => setShowPasswordModalType('download-db-safe')}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow"
                                    >
                                        🔐 Експортувати
                                    </button>
                                    <button
                                        onClick={() => setShowPasswordModalType('restore-db-safe')}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow"
                                    >
                                        🔑 Імпортувати
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* {activeTab === 'settings' && (
                    <div className="max-w-xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            {t('backupPanel.settings')}
                        </h2>
                        <BackupControls />
                    </div>
                )} */}

                {activeTab === 'changeLogs' && (
                    <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-md border border-gray-200 space-y-10">
                        <div className="text-center space-y-2">
                            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">
                                {t('backupPanel.changeLogs')}
                            </h2>
                            <p className="text-gray-600 text-base max-w-2xl mx-auto">
                                Журнали змін зберігають усі дії над даними (додавання, редагування,
                                видалення). Ви можете безпечно <strong>експортувати</strong> або{' '}
                                <strong>імпортувати</strong> ці журнали з шифруванням.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Export Card */}
                            <div className="p-6 border rounded-xl shadow hover:shadow-lg transition group bg-blue-50">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-blue-600 text-white rounded-full">
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                d="M12 4v16m0 0l-6-6m6 6l6-6"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-blue-800">
                                        {t('backupPanel.exportChangeLogs')}
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-700 mb-4">
                                    Створює зашифрований файл журналу змін. Після експорту локальні
                                    зміни(логування) будуть видалені. Тобто зміни, які були додані
                                    можно експортувати 1 раз.
                                </p>
                                <button
                                    onClick={() => setShowPasswordModalType('export')}
                                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition"
                                >
                                    {t('backupPanel.exportChangeLogs')}
                                </button>
                            </div>

                            {/* Import Card */}
                            <div className="p-6 border rounded-xl shadow hover:shadow-lg transition group bg-purple-50">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-purple-600 text-white rounded-full">
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                d="M12 20V4m0 0l6 6m-6-6L6 10"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-purple-800">
                                        {t('backupPanel.importChangeLogs')}
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-700 mb-4">
                                    Імпортує зашифровані зміни з файлу. Якщо пароль правильний,
                                    зміни будуть застосовані без дублювань.
                                </p>
                                <button
                                    onClick={() => setShowPasswordModalType('import')}
                                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition"
                                >
                                    {t('backupPanel.importChangeLogs')}
                                </button>
                            </div>
                        </div>

                        <div className="text-center text-sm text-gray-500 italic pt-2">
                            Синхронізація змін між автономними пристроями — безпечно, точно та
                            просто.
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
