import type { User } from '../../types/user';

export default function UserCard({ user }: { user: User }) {
    return (
        <div className="flex items-center gap-6 mb-6">
            <img
                src={user.photo || 'https://via.placeholder.com/150?text=Photo'}
                alt={user.fullName}
                className="w-[300px] h-[200px] rounded-lg object-cover border"
            />
            <div>
                <h2 className="text-3xl font-bold">{user.fullName}</h2>
                <p className="text-gray-600">{user.rank || '—'}</p>
                <p className="text-sm text-gray-500 mt-1">{user.position || '—'}</p>
            </div>
        </div>
    );
}
