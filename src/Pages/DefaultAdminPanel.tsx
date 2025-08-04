import { useState } from 'react';
import UserManagementTab from '../components/defaultAdmin/UserManagementTab';
import ChangeHistoryTab from '../components/defaultAdmin/ChangeHistoryTab';

export default function DefaultAdminPanel() {
    const [activeTab, setActiveTab] = useState<'users' | 'history'>('users');

    return (
        <div className="pt-[5vh] px-6">
            <h1 className="text-3xl font-bold mb-2 text-blue-800">
                Панель системного адміністратора
            </h1>
            <p className="text-gray-600 mb-6">
                Цей розділ призначений для керування користувачами, ролями, перегляду журналу змін
                та інших налаштувань системного рівня.
            </p>

            <div className="flex border-b mb-4">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 font-medium border-b-2 transition ${
                        activeTab === 'users'
                            ? 'border-blue-600 text-blue-700'
                            : 'border-transparent text-gray-500 hover:text-blue-600'
                    }`}
                >
                    Користувачі
                </button>
                {/* <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 font-medium border-b-2 transition ${
                        activeTab === 'history'
                            ? 'border-blue-600 text-blue-700'
                            : 'border-transparent text-gray-500 hover:text-blue-600'
                    }`}
                >
                    Історія змін
                </button> */}
            </div>

            <div className="bg-white rounded shadow p-4">
                {activeTab === 'users' && <UserManagementTab />}
                {/* {activeTab === 'history' && <ChangeHistoryTab />} */}
            </div>
        </div>
    );
}
