import type { User } from '../../types/user';
import DefaultAvatar from '../../icons/DefaultAvatar';

export default function UserCard({ user }: { user: User }) {
    return (
        <div className="flex items-center gap-6 mb-6">
            {user.photo ? (
                <img
                    src={user.photo}
                    alt={user.fullName}
                    className="w-[300px] h-[200px] rounded-lg object-cover border"
                />
            ) : (
                <div className="w-[300px] h-[200px] ">
                    <DefaultAvatar />
                </div>
            )}
            <div>
                <h2 className="text-3xl font-bold">{user.fullName}</h2>
                <p className="text-gray-600">{user.rank || '—'}</p>
                <p className="text-sm text-gray-500 mt-1">{user.position || '—'}</p>
            </div>
        </div>
    );
}
