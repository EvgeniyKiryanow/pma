import { useUserStore } from '../stores/userStore';
import BackupControls from './BackupControls';

export default function Header() {
    const openUserFormForAdd = useUserStore((s) => s.openUserFormForAdd);
    // const clearUser = useUserStore((s) => s.clearUser); // you need a method in your store to clear user data / auth

    const handleLogout = () => {
        // clearUser();
        window.location.href = '/login';
    };

    return (
        <header className="flex shadow-md py-4 px-4 sm:px-10 bg-white min-h-[70px] tracking-wide relative z-50">
            <div className="flex flex-wrap items-center justify-between gap-5 w-full">
                <h1 className="text-xl font-bold text-gray-800">Personnel Management</h1>
                <div className="flex max-lg:ml-auto space-x-4">
                    <button
                        onClick={openUserFormForAdd}
                        className="px-4 py-2 text-sm rounded-full font-medium cursor-pointer tracking-wide text-white border border-blue-600 bg-blue-600 hover:bg-blue-700 transition-all"
                    >
                        Add new personnel
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm rounded-full font-medium cursor-pointer tracking-wide text-white border border-blue-600 bg-blue-600 hover:bg-blue-700 transition-all"
                    >
                        Log out
                    </button>
                </div>
                <BackupControls />
            </div>
        </header>
    );
}
