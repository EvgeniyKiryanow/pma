import type { User } from '../../types/user';
import DefaultAvatar from '../../icons/DefaultAvatar';
import { getStatusBadge } from '../../utils/statusBadgeUtils'; // ✅ helper for style + icon

export default function UserCard({ user }: { user: User }) {
    // ✅ Get badge style + icon for soldierStatus
    const { badgeStyle, icon } = getStatusBadge(user.soldierStatus);

    return (
        <div className="flex flex-col md:flex-row gap-6 mb-6 p-4 rounded-xl bg-white/80 shadow-md border hover:shadow-lg transition">
            {/* Avatar */}
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
                    <p className="text-lg text-gray-700 font-medium mt-1">🎖️ {user.rank || '—'}</p>
                    {user.position && (
                        <p className="text-sm text-gray-500 mt-0.5 break-words">
                            🏷️ {user.position}
                        </p>
                    )}
                </div>

                {/* ✅ Status Badge */}
                <div className="mt-4">
                    <span className="text-sm text-gray-700 font-medium mr-2">Статус:</span>

                    {user.soldierStatus ? (
                        <span
                            className={`inline-flex items-center gap-2 text-sm px-4 py-1.5 rounded-full border font-medium shadow-sm ${badgeStyle}`}
                        >
                            {icon}
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
