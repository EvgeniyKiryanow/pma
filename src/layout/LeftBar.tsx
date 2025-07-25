import { useState } from 'react';
import { useUserStore } from '../stores/userStore';
import type { User } from '../types/user';
import DefaultAvatar from '../icons/DefaultAvatar';
import { useI18nStore } from '../stores/i18nStore';

type Props = {
    users: User[];
};

export default function LeftBar({ users }: Props) {
    const [filter, setFilter] = useState('');
    const selectedUser = useUserStore((s) => s.selectedUser);
    const setSelectedUser = useUserStore((s) => s.setSelectedUser);
    const { t } = useI18nStore();

    const collapsed = useUserStore((s) => s.sidebarCollapsed);
    const setCollapsed = useUserStore((s) => s.setSidebarCollapsed);

    const filteredUsers = users.filter((user) => {
        const search = filter.toLowerCase();
        const fieldsToSearch = [
            user.fullName,
            user.rank,
            user.id.toString(),
            user.phoneNumber,
            user.email,
            user.dateOfBirth,
            user.awards,
            user.education,
            user.position,
            user.rights,
            user.conscriptionInfo,
            user.notes,
        ];
        const relativesText =
            user.relatives
                ?.map((r) => `${r.name} ${r.relationship} ${r.phone}`)
                .join(' ')
                .toLowerCase() || '';

        return (
            fieldsToSearch.some((field) => field?.toLowerCase().includes(search)) ||
            relativesText.includes(search)
        );
    });

    return (
        <div
            className={`relative transition-all duration-300 ${
                collapsed ? 'w-12 group hover:bg-blue-50/40 cursor-pointer' : 'w-72'
            } flex flex-col border-r border-gray-300 shadow-sm bg-white`}
            // ✅ If collapsed, clicking anywhere will open
            onClick={() => {
                if (collapsed) setCollapsed(false);
            }}
        >
            {/* ✅ Collapse Button always visible */}
            <button
                onClick={(e) => {
                    e.stopPropagation(); // prevent parent onClick
                    setCollapsed(!collapsed);
                }}
                className="absolute -right-4 top-5 z-10 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition"
                title={collapsed ? 'Відкрити меню' : 'Згорнути меню'}
            >
                {collapsed ? '▶' : '◀'}
            </button>

            {/* If collapsed, only minimal placeholder */}
            {!collapsed ? (
                <>
                    {/* Header */}
                    <div className="p-5 border-b border-gray-300 flex-shrink-0">
                        <h2 className="text-xl font-semibold">{t('leftBar.title')}</h2>
                        <p className="text-sm text-gray-500">
                            {t('leftBar.total')}: {filteredUsers.length}
                        </p>
                    </div>

                    {/* Search */}
                    <div className="p-2 border-b border-gray-200 flex-shrink-0">
                        <input
                            type="text"
                            placeholder={t('leftBar.searchPlaceholder')}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-300"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>

                    {/* Scrollable User List */}
                    <ul className="flex-1 overflow-y-auto">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user, index) => (
                                <li
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className={`flex items-center cursor-pointer p-4 border-b border-gray-200 transition-colors duration-200 
                                        hover:bg-blue-100 hover:shadow-sm ${
                                            selectedUser?.id === user.id
                                                ? 'bg-blue-100 font-semibold'
                                                : ''
                                        }`}
                                >
                                    <span className="mr-3 text-gray-500 w-6 text-right select-none">
                                        {index + 1}.
                                    </span>
                                    {user.photo ? (
                                        <img
                                            src={user.photo}
                                            alt={user.fullName}
                                            className="h-6 w-6 mr-2 rounded-full"
                                        />
                                    ) : (
                                        <div className="h-6 w-6 mr-2 rounded-full">
                                            <DefaultAvatar />
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span>{user.fullName}</span>
                                        <span className="text-xs text-gray-500">
                                            {user.rank} • {user.soldierStatus || '—'}
                                        </span>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="p-4 text-gray-400 italic">
                                {t('leftBar.noUsersFound')}
                            </li>
                        )}
                    </ul>
                </>
            ) : (
                // ✅ Minimal view when collapsed
                <div className="flex-1 flex flex-col items-center justify-center text-xs text-gray-400 group-hover:text-blue-700">
                    {/* You can show an icon or vertical text */}
                    <span className="rotate-90 tracking-wide">Меню</span>
                </div>
            )}
        </div>
    );
}
