import type { User } from '../../../../types/user';
import DefaultAvatar from '../../../shared/icons/DefaultAvatar';
import {
    getCategoryBadge,
    getPositionBadge,
    getShpkBadge,
    getUnitBadge,
} from '../../../shared/utils/posadyBadgeHelper';
import { getStatusBadge } from '../../../shared/utils/statusBadgeUtils';
import { useUserStore } from '../../../stores/userStore';

export default function UserCard({ user }: { user: User }) {
    const sidebarCollapsed = useUserStore((s) => s.sidebarCollapsed);
    const { badgeStyle: statusBadge, icon: statusIcon } = getStatusBadge(user.soldierStatus);

    const unit = getUnitBadge(user.unitMain);
    const posada = getPositionBadge(user.position);
    const category = getCategoryBadge(user.category);
    const shpk = getShpkBadge(user.shpkCode);

    return (
        <div
            className={`
        flex gap-6 mb-6 p-4 rounded-xl bg-white/80 shadow-md border hover:shadow-lg transition
        ${sidebarCollapsed ? 'flex-col' : 'flex-col md:flex-row'}
      `}
        >
            {user.photo ? (
                <img
                    src={user.photo}
                    alt={user.fullName}
                    className="w-[280px] h-[200px] rounded-xl object-cover border shadow-sm"
                />
            ) : (
                <div className="w-[280px] h-[200px] flex items-center justify-center bg-gray-100 rounded-xl border shadow-sm">
                    <DefaultAvatar />
                </div>
            )}

            {/* Info */}
            <div className="flex flex-col justify-between flex-1 min-w-0">
                {/* Name + rank */}
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 break-words">
                        {user.fullName}
                    </h2>
                    <p className="text-lg text-gray-700 font-medium mt-1">
                        🎖️ {user.shpkCode || user.rank || '—'}
                    </p>
                </div>

                {/* ✅ Assigned Posada Info */}
                {user.position && (
                    <div className="mt-3 space-y-2">
                        {/* Posada name */}
                        <div className="mt-3 space-y-2">
                            <div className="flex flex-wrap gap-2 items-center">
                                {/* Unit badge */}
                                <span
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium ${unit.badgeStyle}`}
                                >
                                    {unit.icon} <strong>Підрозділ:</strong> {user.unitMain || '—'}
                                </span>

                                {/* Position badge */}
                                <span
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium ${posada.badgeStyle}`}
                                >
                                    {posada.icon} <strong>Посада:</strong> {user.position || '—'}
                                </span>

                                {/* Category badge */}
                                {user.category && (
                                    <span
                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium ${category.badgeStyle}`}
                                    >
                                        {category.icon} <strong>Категорія:</strong> {user.category}
                                    </span>
                                )}

                                {/* Rank */}
                                {user.rank && (
                                    <span
                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium ${shpk.badgeStyle}`}
                                    >
                                        {shpk.icon} <strong>Звання:</strong> {user.rank}
                                    </span>
                                )}

                                {/* SHPK code */}
                                {user.shpkCode && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium bg-blue-50 text-blue-800 border-blue-200">
                                        📜 <strong>ШПК:</strong> {user.shpkCode}
                                    </span>
                                )}
                                {user.shpkNumber && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium bg-blue-50 text-blue-800 border-blue-200">
                                        📜 <strong>Номер по штату:</strong> {user.shpkNumber}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ✅ Status Badge */}
                <div className="mt-4">
                    <span className="text-sm text-gray-700 font-medium mr-2">Статус:</span>

                    {user.soldierStatus ? (
                        <span
                            className={`inline-flex items-center gap-2 text-sm px-4 py-1.5 rounded-full border font-medium shadow-sm ${statusBadge}`}
                        >
                            {statusIcon}
                            <span className="break-words">{user.soldierStatus}</span>
                        </span>
                    ) : (
                        <span className="text-sm text-gray-400 italic">— не вказано —</span>
                    )}
                </div>

                {/* Optional contact info */}
                {user.phoneNumber && (
                    <div className="mt-4 flex items-center gap-2 text-gray-600 text-sm">
                        📞 <span>{user.phoneNumber}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
