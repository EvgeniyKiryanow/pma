import { useEffect, useState } from 'react';
import { useUserStore } from '../stores/userStore';
import { LogOut, PlusCircle, Clock, Gift } from 'lucide-react';
import type { User } from '../types/user';

type HeaderProps = {
    currentTab: 'manager' | 'backups';
    setCurrentTab: (tab: 'manager' | 'backups') => void;
};

export default function Header({ currentTab, setCurrentTab }: HeaderProps) {
    const openUserFormForAdd = useUserStore((s) => s.openUserFormForAdd);
    const [now, setNow] = useState<string>(() => formatDateTime(new Date()));
    const [upcomingBirthdays, setUpcomingBirthdays] = useState<User[]>([]);
    const [showBirthdayModal, setShowBirthdayModal] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(formatDateTime(new Date()));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const loadUpcoming = async () => {
            const users = await window.electronAPI.fetchUsers();
            const today = new Date();
            const todayYear = today.getFullYear();

            const upcoming = users.filter((user: User) => {
                if (!user.dateOfBirth) return false;

                const dob = new Date(user.dateOfBirth);
                const nextBirthday = new Date(todayYear, dob.getMonth(), dob.getDate());

                if (nextBirthday < today) {
                    nextBirthday.setFullYear(todayYear + 1);
                }

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
        localStorage.removeItem('authToken'); // remove token
        window.location.reload(); // reload the app to trigger login screen
    };

    return (
        <header className="bg-white shadow border-b relative">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 sm:px-10 py-3">
                <div className="flex items-center gap-3">
                    <img src="./assets/icons/appIcon.png" alt="Logo" className="w-8 h-8" />
                    <h1 className="text-lg font-bold tracking-tight">Personnel Manager</h1>
                </div>
                <div className="flex items-center gap-6 text-gray-700">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{now}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 cursor-pointer">
                    {upcomingBirthdays.length > 0 && (
                        <button
                            onClick={() => setShowBirthdayModal(true)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-yellow-100 text-yellow-800 border border-yellow-300 cursor-pointer transition hover:bg-yellow-200"
                            title="View upcoming birthdays"
                        >
                            <Gift className="w-4 h-4" />
                            {upcomingBirthdays.length} upcoming birthday
                            {upcomingBirthdays.length > 1 ? 's' : ''}
                        </button>
                    )}

                    {currentTab === 'manager' && (
                        <button
                            onClick={openUserFormForAdd}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                        >
                            <PlusCircle className="w-4 h-4" />
                            Add new Person
                        </button>
                    )}

                    <button
                        onClick={handleLogout}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-red-500 hover:bg-red-600 text-white shadow-sm transition"
                    >
                        <LogOut className="w-4 h-4" />
                        Log out
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <nav className="bg-gray-50 px-4 sm:px-10 border-t">
                <div className="flex gap-3 py-2">
                    <button
                        onClick={() => setCurrentTab('manager')}
                        className={`px-4 py-1.5 text-sm rounded-t-md border-b-2 transition-all ${
                            currentTab === 'manager'
                                ? 'text-blue-600 border-blue-600 font-semibold bg-white'
                                : 'text-gray-600 border-transparent hover:text-blue-600 hover:border-blue-300'
                        }`}
                    >
                        Manager
                    </button>
                    <button
                        onClick={() => setCurrentTab('backups')}
                        className={`px-4 py-1.5 text-sm rounded-t-md border-b-2 transition-all ${
                            currentTab === 'backups'
                                ? 'text-blue-600 border-blue-600 font-semibold bg-white'
                                : 'text-gray-600 border-transparent hover:text-blue-600 hover:border-blue-300'
                        }`}
                    >
                        Backups
                    </button>
                </div>
            </nav>

            {/* Birthday Modal */}
            {showBirthdayModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                    <div className="bg-white max-w-md w-full rounded-lg p-6 shadow-lg border relative">
                        <h2 className="text-lg font-bold mb-4">🎂 Upcoming Birthdays</h2>

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
                                        className="flex justify-between items-center text-sm text-gray-800"
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

// Helper
function formatDateTime(date: Date): string {
    return date.toLocaleString('uk-UA', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}
