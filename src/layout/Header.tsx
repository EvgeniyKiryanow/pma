import { useUserStore } from '../stores/userStore';

type HeaderProps = {
    currentTab: 'manager' | 'backups';
    setCurrentTab: (tab: 'manager' | 'backups') => void;
};

export default function Header({ currentTab, setCurrentTab }: HeaderProps) {
    const openUserFormForAdd = useUserStore((s) => s.openUserFormForAdd);

    const handleLogout = () => {
        window.location.href = '/login';
    };

    return (
        <header className="bg-white shadow-md">
            {/* Top Header Bar */}
            <div className="flex items-center justify-between px-4 sm:px-10 py-4">
                <h1 className="text-xl font-bold text-gray-800">Personnel Manager</h1>
                <div className="flex space-x-4">
                    {currentTab === 'manager' && (
                        <button
                            onClick={openUserFormForAdd}
                            className="px-4 py-2 text-sm rounded-full font-medium cursor-pointer tracking-wide text-white border border-blue-600 bg-blue-600 hover:bg-blue-700 transition-all"
                        >
                            Add Personnel
                        </button>
                    )}
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm rounded-full font-medium cursor-pointer tracking-wide text-white border border-blue-600 bg-blue-600 hover:bg-blue-700 transition-all"
                    >
                        Log out
                    </button>
                </div>
            </div>

            {/* Tab Switcher Bar */}
            <nav className="border-t border-b border-gray-200 bg-gray-50 px-4 sm:px-10">
                <div className="flex gap-4 py-2">
                    <button
                        onClick={() => setCurrentTab('manager')}
                        className={`text-sm px-4 py-2 rounded-t-md border-b-2 transition-all ${
                            currentTab === 'manager'
                                ? 'text-blue-600 border-blue-600 font-medium bg-white'
                                : 'text-gray-600 border-transparent hover:text-blue-600 hover:border-blue-300'
                        }`}
                    >
                        Manager
                    </button>
                    <button
                        onClick={() => setCurrentTab('backups')}
                        className={`text-sm px-4 py-2 rounded-t-md border-b-2 transition-all ${
                            currentTab === 'backups'
                                ? 'text-blue-600 border-blue-600 font-medium bg-white'
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
