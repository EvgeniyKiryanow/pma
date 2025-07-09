import { useReportsStore } from '../../stores/reportsStore';
import { useI18nStore } from '../../stores/i18nStore';
import { useEffect, useState } from 'react';
import type { User } from '../../types/user';

export default function SavedReportsTab() {
    const { t } = useI18nStore();
    const { savedTemplates, selectedUserId, setSelectedUser } = useReportsStore();

    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const loadUsers = async () => {
            const data = await window.electronAPI.fetchUsers();
            setUsers(data);
        };
        loadUsers();
    }, []);

    return (
        <div className="flex h-full">
            {/* User List */}
            <aside className="w-1/4 border-r p-4 overflow-y-auto bg-gray-50">
                <h3 className="text-lg font-semibold mb-3">{t('reports.selectUser')}</h3>
                <ul className="space-y-2">
                    {users.map((u) => (
                        <li
                            key={u.id}
                            onClick={() => setSelectedUser(u.id)}
                            className={`cursor-pointer p-2 rounded hover:bg-blue-100 transition ${
                                selectedUserId === u.id ? 'bg-blue-200 font-medium' : ''
                            }`}
                        >
                            {u.fullName}
                        </li>
                    ))}
                </ul>
            </aside>

            {/* Saved Templates */}
            <main className="flex-1 p-6 overflow-y-auto bg-white">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                    {t('reports.savedTemplates')}
                </h2>
                {savedTemplates.length > 0 ? (
                    <ul className="space-y-2 text-sm text-gray-700">
                        {savedTemplates.map((tpl: any) => (
                            <li
                                key={tpl.id}
                                className="border p-3 rounded shadow-sm bg-gray-50 hover:bg-gray-100"
                            >
                                <div className="font-medium">📁 {tpl.name}</div>
                                <div className="text-xs text-gray-500">
                                    {new Date(tpl.timestamp).toLocaleString()}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">{t('reports.noSavedTemplates')}</p>
                )}
            </main>
        </div>
    );
}
