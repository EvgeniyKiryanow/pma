import { useUserStore } from '../stores/userStore';
import { useEffect, useState } from 'react';
import type { User } from '../types/user';
import { useI18nStore } from '../stores/i18nStore';

export default function ReportsTab() {
    const { t } = useI18nStore();
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const result = await window.electronAPI.fetchUsers();
            setUsers(result);
        };
        fetchData();
    }, []);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">{t('reports.title')}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Example report block */}
                <div className="bg-white border shadow rounded p-4">
                    <h3 className="text-lg font-semibold mb-2">{t('reports.totalUsers')}</h3>
                    <p className="text-3xl font-bold text-blue-600">{users.length}</p>
                </div>
                {/* Add more analytics/report blocks here */}
            </div>
        </div>
    );
}
