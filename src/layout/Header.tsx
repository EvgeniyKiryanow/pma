import { useEffect, useState } from 'react';
import { useUserStore } from '../stores/userStore';
import { LogOut, PlusCircle, Settings, Clock } from 'lucide-react';

type HeaderProps = {
    currentTab: 'manager' | 'backups';
    setCurrentTab: (tab: 'manager' | 'backups') => void;
};

export default function Header({ currentTab, setCurrentTab }: HeaderProps) {
    const openUserFormForAdd = useUserStore((s) => s.openUserFormForAdd);
    const [now, setNow] = useState<string>(() => formatDateTime(new Date()));

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(formatDateTime(new Date()));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        window.location.href = '/login';
    };

    return (
        <header className="bg-white shadow border-b">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 sm:px-10 py-3">
                {/* Time + Title */}
                <div className="flex items-center gap-6 text-gray-700">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{now}</span>
                    </div>
                    <h1 className="text-lg font-bold tracking-tight">Personnel Manager</h1>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2">
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 transition"
                        onClick={() => alert('Settings coming soon')}
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </button>
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
        </header>
    );
}

// Helper function
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
