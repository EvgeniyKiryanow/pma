import { useState } from 'react';
import { useUserStore } from '../stores/userStore';
import type { User } from '../types/user';
import DefaultAvatar from '../icons/DefaultAvatar';
import { getStatusBadge } from '../utils/statusBadgeUtils';
import { useI18nStore } from '../stores/i18nStore';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // ✅ arrow icons

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
            } flex flex-col border-r border-gray-200 bg-white shadow-md`}
            onClick={() => {
                if (collapsed) setCollapsed(false);
            }}
        >
            {/* ✅ Modern slim toggle handle with arrow */}
            <div
                onClick={(e) => {
                    e.stopPropagation(); // prevent accidental expand when clicking
                    setCollapsed(!collapsed);
                }}
                className={`
                    absolute top-1/2 -right-3 -translate-y-1/2 
                    w-6 h-14 rounded-full cursor-pointer flex items-center justify-center
                    bg-gradient-to-b from-blue-500 to-blue-600 
                    shadow-lg opacity-80 hover:opacity-100 transition-all
                `}
                title={collapsed ? 'Відкрити меню' : 'Згорнути меню'}
            >
                {/* ✅ Animated arrow flips direction */}
                {collapsed ? (
                    <ChevronRight className="w-4 h-4 text-white transition-transform duration-200" />
                ) : (
                    <ChevronLeft className="w-4 h-4 text-white transition-transform duration-200" />
                )}
            </div>

            {!collapsed ? (
                <>
                    {/* Header */}
                    <div className="p-5 border-b border-gray-200 flex-shrink-0">
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
                    <ul className="flex-1 overflow-y-auto space-y-3 p-3">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user, index) => {
                                const isSelected = selectedUser?.id === user.id;

                                // ✅ Get badge style & icon from helper
                                const { icon: badgeIcon, badgeStyle } = getStatusBadge(
                                    user.soldierStatus,
                                );

                                return (
                                    <li
                                        key={user.id}
                                        onClick={() => setSelectedUser(isSelected ? null : user)}
                                        className={`flex flex-col gap-3 rounded-xl border p-4 transition-all cursor-pointer
                                                ${
                                                    isSelected
                                                        ? 'bg-blue-50 border-blue-400 shadow-md ring-1 ring-blue-200'
                                                        : 'bg-white border-gray-200 hover:shadow-md hover:border-blue-300 hover:bg-blue-50/40'
                                                }`}
                                    >
                                        <div className="flex items-center">
                                            <div className="w-6 text-xs text-gray-400">
                                                {index + 1}.
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-4">
                                                    {/* Name + Rank */}
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-semibold text-gray-800 text-[15px] break-words">
                                                            {user.fullName}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-xs text-gray-500 flex-wrap">
                                                            <span className="break-words">
                                                                {user.rank || '—'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ✅ Soldier Status Badge */}
                                                {user.soldierStatus && (
                                                    <div className="flex flex-wrap">
                                                        <span
                                                            className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border font-medium shadow-sm break-words ${badgeStyle}`}
                                                            title={user.soldierStatus}
                                                        >
                                                            {badgeIcon}{' '}
                                                            <span>{user.soldierStatus}</span>
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Phone */}
                                                {user.phoneNumber && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-600 break-words">
                                                        📞 <span>{user.phoneNumber}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })
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
                    <span className="rotate-90 tracking-wide font-medium">Меню</span>
                </div>
            )}
        </div>
    );
}

{
    /* {user.photo ? (
                                                <img
                                                    src={user.photo}
                                                    alt={user.fullName}
                                                    className="h-12 w-12 rounded-full object-cover border border-gray-300 shadow-sm hover:scale-105 transition-transform"
                                                />
                                            ) : (
                                                <div className="h-12 w-12 rounded-full bg-gray-100 border flex items-center justify-center text-gray-400 hover:scale-105 transition-transform">
                                                    <DefaultAvatar />
                                                </div>
                                            )} */
}
