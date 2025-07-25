import { useEffect, useState } from 'react';
import { useUserStore } from '../stores/userStore';
import {
    LogOut,
    PlusCircle,
    Gift,
    Users,
    FileBarChart,
    DatabaseBackup,
    FileSpreadsheet,
    BookText,
} from 'lucide-react';
import type { User } from '../types/user';
import { useI18nStore } from '../stores/i18nStore';
import LogoSvg from '../icons/LogoSvg';

type HeaderProps = {
    currentTab:
        | 'manager'
        | 'backups'
        | 'reminders'
        | 'reports'
        | 'tables'
        | 'instructions'
        | 'importUsers';
    setCurrentTab: (
        tab:
            | 'manager'
            | 'backups'
            | 'reminders'
            | 'reports'
            | 'tables'
            | 'instructions'
            | 'importUsers',
    ) => void;
};

export default function Header({ currentTab, setCurrentTab }: HeaderProps) {
    const openUserFormForAdd = useUserStore((s) => s.openUserFormForAdd);
    const [upcomingBirthdays, setUpcomingBirthdays] = useState<User[]>([]);
    const [showBirthdayModal, setShowBirthdayModal] = useState(false);
    const { t, language, setLanguage } = useI18nStore();

    useEffect(() => {
        const loadUpcoming = async () => {
            const users = await window.electronAPI.fetchUsers();
            const today = new Date();
            const todayYear = today.getFullYear();

            const upcoming = users.filter((user: User) => {
                if (!user.dateOfBirth) return false;

                const dob = new Date(user.dateOfBirth);
                const nextBirthday = new Date(todayYear, dob.getMonth(), dob.getDate());

                if (nextBirthday < today) nextBirthday.setFullYear(todayYear + 1);

                const diffDays = Math.floor(
                    (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                );
                return diffDays >= 0 && diffDays <= 7;
            });

            setUpcomingBirthdays(upcoming);
        };

        loadUpcoming();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        window.location.reload();
    };

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
                    {/* ✅ Birthdays */}
                    {upcomingBirthdays.length > 0 && (
                        <button
                            onClick={() => setShowBirthdayModal(true)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border border-yellow-300 transition"
                            title={t('header.viewBirthdays')}
                        >
                            <Gift className="w-4 h-4" />
                            {upcomingBirthdays.length}{' '}
                            {upcomingBirthdays.length === 1
                                ? t('header.upcomingBirthday')
                                : t('header.upcomingBirthdays')}
                        </button>
                    )}

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
                        {/* <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-full ${
                language === 'en' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
              }`}
            >
              EN
            </button> */}
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
                    {tabs.map((tab) => {
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
            {showBirthdayModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                    <div className="bg-white max-w-md w-full rounded-lg p-6 shadow-lg border relative">
                        <h2 className="text-lg font-bold mb-4">{t('header.birthdayTitle')}</h2>

                        <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                            {upcomingBirthdays.map((user) => {
                                const dob = new Date(user.dateOfBirth!);
                                const dateStr = dob.toLocaleDateString('uk-UA', {
                                    day: '2-digit',
                                    month: 'long',
                                });

                                return (
                                    <li
                                        key={user.id}
                                        className="flex justify-between items-center text-sm text-gray-800 border-b pb-1"
                                    >
                                        <span>{user.fullName}</span>
                                        <span className="text-gray-500">{dateStr}</span>
                                    </li>
                                );
                            })}
                        </ul>

                        <button
                            onClick={() => setShowBirthdayModal(false)}
                            className="absolute top-2 right-3 text-gray-500 hover:text-red-600 text-lg font-bold"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}
