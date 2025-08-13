import {
    BookText,
    DatabaseBackup,
    FileBarChart,
    FileSpreadsheet,
    Info,
    LogOut,
    PlusCircle,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { useI18nStore } from '../../../stores/i18nStore';
import { useUserStore } from '../../../stores/userStore';
import type { User } from '../../../types/user';
import EventsModalLauncher from '../../shared/components/EventsModalLauncher';
import LogoSvg from '../../shared/icons/LogoSvg';

type HeaderProps = {
    currentTab:
        | 'manager'
        | 'backups'
        | 'reminders'
        | 'reports'
        | 'tables'
        | 'instructions'
        | 'importUsers'
        | 'shtatni';
    setCurrentTab: (
        tab:
            | 'manager'
            | 'backups'
            | 'reminders'
            | 'reports'
            | 'tables'
            | 'instructions'
            | 'importUsers'
            | 'shtatni',
    ) => void;
};
import { useIncompleteHistoryStore } from '../../../stores/useIncompleteHistoryStore';

export default function Header({ currentTab, setCurrentTab }: HeaderProps) {
    const openUserFormForAdd = useUserStore((s) => s.openUserFormForAdd);
    const { t, language, setLanguage } = useI18nStore();
    const [showIncompleteModal, setShowIncompleteModal] = useState(false);
    const incompleteEntries = useIncompleteHistoryStore((s) => s.entries);
    const [usersById, setUsersById] = useState<Record<number, User>>({});
    const headerCollapsed = useUserStore((s) => s.headerCollapsed);
    const setHeaderCollapsed = useUserStore((s) => s.setHeaderCollapsed);

    const [hasShtatni, setHasShtatni] = useState(false);
    useEffect(() => {
        const loadUsers = async () => {
            const allUsers: User[] = await window.electronAPI.fetchUsersMetadata();

            // 🧹 Strip history to reduce memory footprint
            const map = Object.fromEntries(allUsers.map((u) => [u.id, { ...u, history: [] }]));
            setUsersById(map);
        };
        loadUsers();
    }, []);

    useEffect(() => {
        const checkIncompleteHistories = async () => {
            const allUsers: User[] = await window.electronAPI.fetchUsersMetadata();
            useIncompleteHistoryStore.getState().clearAll();

            for (const user of allUsers.filter(
                (u) => u.shpkNumber !== 'excluded' && !String(u.shpkNumber).includes('order'),
            )) {
                if (!user.history) continue;
                for (const entry of user.history) {
                    if (entry.type !== 'statusChange') continue;

                    const hasNoFiles = !entry.files || entry.files.length === 0;
                    const hasNoPeriod = !entry.period;

                    if (hasNoFiles || hasNoPeriod) {
                        useIncompleteHistoryStore
                            .getState()
                            .addIncomplete(
                                user.id,
                                entry.id,
                                hasNoFiles && hasNoPeriod
                                    ? 'missing_both'
                                    : hasNoFiles
                                      ? 'missing_file'
                                      : 'missing_period',
                            );
                    }
                }
            }
        };
        checkIncompleteHistories();
    }, []);

    // ✅ Check if штатні посади table has data
    useEffect(() => {
        const checkShtatni = async () => {
            const shtatni = await window.electronAPI.shtatni.fetchAll();
            setHasShtatni(shtatni.length > 0);
        };
        checkShtatni();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('role');
        window.location.reload();
    };

    // ✅ Base tabs
    const tabs = [
        {
            key: 'manager',
            label: t('header.managerTab'),
            icon: <Users className="w-4 h-4" />,
        },
        {
            key: 'reports',
            label: t('header.reportsTab'),
            icon: <FileBarChart className="w-4 h-4" />,
        },
        {
            key: 'backups',
            label: t('header.backupTab'),
            icon: <DatabaseBackup className="w-4 h-4" />,
        },
        {
            key: 'importUsers',
            label: 'Excel',
            icon: <FileSpreadsheet className="w-4 h-4" />,
        },
        {
            key: 'instructions',
            label: t('header.instructions'),
            icon: <BookText className="w-4 h-4" />,
        },
    ] as const;

    // ✅ Conditionally add "Штатні посади" if DB has data
    const allTabs = hasShtatni
        ? [
              ...tabs.slice(0, 4),
              {
                  key: 'shtatni',
                  label: 'БЧС',
                  icon: <FileSpreadsheet className="w-4 h-4" />,
              },
              ...tabs.slice(4),
          ]
        : tabs;

    return (
        <header className="bg-gradient-to-r from-blue-50 to-blue-100 shadow border-b relative">
            {/* === TOP BAR === */}
            <div className="flex items-center justify-between px-4 sm:px-8 py-3">
                {/* Logo & Title */}
                <div className="flex items-center gap-3">
                    <div className="w-[55px] h-[55px]">
                        <LogoSvg />
                    </div>
                    <div className="flex flex-col leading-tight">
                        <h1 className="text-xl font-bold text-gray-800 tracking-wide">
                            {t('header.title')}
                        </h1>
                        <span className="text-xs text-gray-500">
                            {new Date().toLocaleDateString('uk-UA', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                            })}
                        </span>
                    </div>
                </div>
                {/* Right Controls */}
                <div className="flex items-center gap-3">
                    {incompleteEntries.length > 0 && (
                        <button
                            onClick={() => setShowIncompleteModal(true)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm rounded-full bg-red-100 hover:bg-red-200 text-red-900 border border-red-300 shadow-sm animate-pulse font-semibold transition"
                            title="Записи без файлу або періоду"
                        >
                            <Info className="w-4 h-4" />
                            {incompleteEntries.length} записів потребують термінового заповнення
                        </button>
                    )}

                    <EventsModalLauncher />

                    {/* ✅ Add User (only in Manager) */}
                    {currentTab === 'manager' && (
                        <button
                            onClick={openUserFormForAdd}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                        >
                            <PlusCircle className="w-4 h-4" />
                            {t('header.addUser')}
                        </button>
                    )}

                    {/* ✅ Language Switcher */}
                    <div className="flex items-center gap-1 text-xs bg-white rounded-full px-2 py-1 shadow-sm border">
                        <button
                            onClick={() => setLanguage('ua')}
                            className={`px-2 py-1 rounded-full ${
                                language === 'ua' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                            }`}
                        >
                            UA
                        </button>
                    </div>

                    {/* ✅ Logout */}
                    <button
                        onClick={handleLogout}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full bg-red-500 hover:bg-red-600 text-white shadow-sm transition"
                    >
                        <LogOut className="w-4 h-4" />
                        {t('header.logout')}
                    </button>
                </div>
            </div>

            {/* === MODERN TABS === */}
            <nav className="px-4 sm:px-8 border-t bg-white shadow-lg shadow-gray-300 relative z-10">
                <div className="flex gap-2 py-2 overflow-x-auto">
                    {allTabs.map((tab) => {
                        const isActive = currentTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setCurrentTab(tab.key as HeaderProps['currentTab'])}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                    isActive
                                        ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-300'
                                        : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </nav>
            {/* === Birthday Modal === */}

            {showIncompleteModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                    <div className="bg-white max-w-2xl w-full rounded-xl p-6 shadow-xl border relative">
                        <h2 className="text-xl font-bold mb-3 text-red-700 flex items-center gap-2">
                            <Info className="w-5 h-5 text-red-600" />
                            Виявлено записи без файлу або періоду
                        </h2>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 mb-5">
                            📌 <strong>Інструкція:</strong> Щоб виправити помилки:
                            <ol className="list-decimal list-inside mt-2 space-y-1">
                                <li>
                                    Перейдіть у вкладку <strong>&quot;Менеджер&quot;</strong>.
                                </li>
                                <li>Знайдіть користувача за ім’ям, вказаним нижче.</li>
                                <li>
                                    Перейдіть до розділу <strong>історії</strong> цього користувача.
                                </li>
                                <li>
                                    У пошуку введіть:{' '}
                                    <code className="bg-gray-100 px-1 py-0.5 rounded border text-red-600 text-xs">
                                        Відсутній файл або період
                                    </code>
                                    .
                                </li>
                                <li>Оновіть відповідні записи, додавши файл та/або період.</li>
                            </ol>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto text-sm">
                            {Object.entries(
                                incompleteEntries.reduce<Record<number, any>>((acc, entry) => {
                                    if (!acc[entry.userId]) acc[entry.userId] = [];
                                    acc[entry.userId].push(entry);
                                    return acc;
                                }, {}),
                            ).map(([userIdStr, entries]) => {
                                const user = usersById[Number(userIdStr)];
                                return (
                                    <div
                                        key={userIdStr}
                                        className="border border-gray-200 bg-gray-50 rounded-lg p-3 shadow-sm"
                                    >
                                        <div className="font-semibold text-blue-800 text-sm mb-2">
                                            👤 {user?.fullName || `Користувач (ID ${userIdStr})`}
                                        </div>
                                        <ul className="list-disc pl-5 text-gray-700 space-y-1">
                                            {entries.map(
                                                (entry: {
                                                    entryId: number;
                                                    reason:
                                                        | 'missing_file'
                                                        | 'missing_period'
                                                        | 'missing_both';
                                                }) => (
                                                    <li key={entry.entryId}>
                                                        <span className="text-gray-500">Запис</span>{' '}
                                                        №{' '}
                                                        <span className="font-mono text-blue-700">
                                                            {entry.entryId}
                                                        </span>
                                                        :{' '}
                                                        {
                                                            {
                                                                missing_file: 'відсутній файл',
                                                                missing_period: 'відсутній період',
                                                                missing_both:
                                                                    'немає файлу та періоду',
                                                            }[entry.reason]
                                                        }
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setShowIncompleteModal(false)}
                            className="absolute top-3 right-4 text-gray-500 hover:text-red-600 text-xl font-bold"
                            aria-label="Закрити"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}
