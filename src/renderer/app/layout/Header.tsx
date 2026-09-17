import { Info, LogOut, PlusCircle, UserCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import MyAccountDialog from '../../features/account/ui/MyAccountDialog';
import { useIncompleteHistoryStore } from '../../features/report/model/useIncompleteHistoryStore';
import EventsModalLauncher from '../../shared/components/EventsModalLauncher';
import LogoSvg from '../../shared/icons/LogoSvg';
import { useI18nStore } from '../../stores/i18nStore';
import { usePermissions, useSessionStore } from '../../stores/sessionStore';
import { type TabKey, useUserStore } from '../../stores/userStore';
import type { TabDefinition } from '../navigation';

type HeaderProps = {
    tabs: TabDefinition[];
    currentTab: TabKey;
    setCurrentTab: (tab: TabKey) => void;
};

const REASON_LABELS = {
    missing_file: 'відсутній файл',
    missing_period: 'відсутній період',
    missing_both: 'немає файлу та періоду',
} as const;

export default function Header({ tabs, currentTab, setCurrentTab }: HeaderProps) {
    const openUserFormForAdd = useUserStore((s) => s.openUserFormForAdd);
    const users = useUserStore((s) => s.users);
    const { t, language, setLanguage } = useI18nStore();
    const { session, can } = usePermissions();
    const logout = useSessionStore((s) => s.logout);
    const [showIncompleteModal, setShowIncompleteModal] = useState(false);
    const [showAccountDialog, setShowAccountDialog] = useState(false);
    const incompleteEntries = useIncompleteHistoryStore((s) => s.entries);
    const loadIncomplete = useIncompleteHistoryStore((s) => s.load);

    const canViewPersonnel = can('personnel.view');

    useEffect(() => {
        if (canViewPersonnel) void loadIncomplete();
    }, [canViewPersonnel, users, loadIncomplete]);

    const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

    const incompleteByUser = useMemo(() => {
        const groups = new Map<number, typeof incompleteEntries>();
        for (const entry of incompleteEntries) {
            groups.set(entry.userId, [...(groups.get(entry.userId) ?? []), entry]);
        }
        return [...groups.entries()];
    }, [incompleteEntries]);

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

                    {canViewPersonnel && <EventsModalLauncher />}

                    {currentTab === 'manager' && can('personnel.create') && (
                        <button
                            onClick={openUserFormForAdd}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                        >
                            <PlusCircle className="w-4 h-4" />
                            {t('header.addUser')}
                        </button>
                    )}

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

                    {session && (
                        <button
                            onClick={() => setShowAccountDialog(true)}
                            className="hidden md:flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs shadow-sm border hover:bg-blue-50"
                            title={`${t('admin.security.title')} · ${t('session.role')}: ${session.roleName}`}
                        >
                            <UserCircle2 className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-gray-800">
                                {session.displayName || session.username}
                            </span>
                            <span className="text-gray-500">· {session.roleName}</span>
                        </button>
                    )}
                    {showAccountDialog && (
                        <MyAccountDialog onClose={() => setShowAccountDialog(false)} />
                    )}

                    <button
                        onClick={() => void logout()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full bg-red-500 hover:bg-red-600 text-white shadow-sm transition"
                    >
                        <LogOut className="w-4 h-4" />
                        {t('header.logout')}
                    </button>
                </div>
            </div>

            {/* === TABS === */}
            <nav className="px-4 sm:px-8 border-t bg-white shadow-lg shadow-gray-300 relative z-10">
                <div className="flex gap-2 py-2 overflow-x-auto">
                    {tabs.map((tab) => {
                        const isActive = currentTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setCurrentTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                    isActive
                                        ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-300'
                                        : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
                                }`}
                            >
                                {tab.icon}
                                {tab.label(t)}
                            </button>
                        );
                    })}
                </div>
            </nav>

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
                            {incompleteByUser.map(([userId, entries]) => (
                                <div
                                    key={userId}
                                    className="border border-gray-200 bg-gray-50 rounded-lg p-3 shadow-sm"
                                >
                                    <div className="font-semibold text-blue-800 text-sm mb-2">
                                        👤{' '}
                                        {usersById.get(userId)?.fullName ||
                                            `Користувач (ID ${userId})`}
                                    </div>
                                    <ul className="list-disc pl-5 text-gray-700 space-y-1">
                                        {entries.map((entry) => (
                                            <li key={entry.entryId}>
                                                <span className="text-gray-500">Запис</span> №{' '}
                                                <span className="font-mono text-blue-700">
                                                    {entry.entryId}
                                                </span>
                                                : {REASON_LABELS[entry.reason]}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
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
