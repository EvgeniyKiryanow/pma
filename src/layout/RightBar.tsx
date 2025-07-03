import { useState } from 'react';
import { useUserStore } from '../stores/userStore'; // <-- import your store
import type { User, CommentOrHistoryEntry } from '../types/user';
import UserCard from '../components/userInfo/UserCard';
import UserRelatives from '../components/userInfo/UserRelatives';
import UserHistory from '../components/userInfo/UserHistory';

import UserFormModal from '../components/userFormModal'; // edit/add modal
import CommentsModal from '../components/userInfo/CommentsModal'; // comments modal

type RightBarProps = {
    user: User | null;
};

export default function RightBar({ user }: RightBarProps) {
    const [editUser, setEditUser] = useState<User | null>(null);
    const [showComments, setShowComments] = useState(false);

    const updateUser = useUserStore((s) => s.updateUser);

    // New function to add history entry to the current user
    const handleAddHistory = (newEntry: CommentOrHistoryEntry) => {
        if (!user) return;

        const updatedUser: User = {
            ...user,
            history: [...(user.history || []), newEntry],
        };

        updateUser(updatedUser);
    };
    const handleDeleteHistory = (id: number) => {
        if (!user) return;

        const updatedUser: User = {
            ...user,
            history: (user.history || []).filter((h) => h.id !== id),
        };

        updateUser(updatedUser);
    };

    if (!user) {
        return (
            <aside className="flex-1 bg-gray-50 p-8 text-gray-500 flex items-center justify-center">
                <p className="text-lg italic">Select a user to see details</p>
            </aside>
        );
    }

    return (
        <aside className="flex-1 bg-white p-8 overflow-y-auto shadow-inner">
            <div className="max-w-3xl mx-auto">
                {/* Edit and Comments buttons */}
                <div className="flex justify-end gap-3 mb-6">
                    <button
                        onClick={() => setEditUser(user)}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow"
                    >
                        Edit User / Редагувати
                    </button>
                    <button
                        onClick={() => setShowComments(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
                    >
                        Comments / Коментарі
                    </button>
                </div>

                <UserCard user={user} />
                <div className="space-y-4 text-gray-800">
                    {/* Basic Info */}
                    <div>
                        <strong className="block text-sm text-gray-500">
                            Date of Birth/Дата Народження
                        </strong>
                        <p>{user.dateOfBirth || '—'}</p>
                    </div>
                    <div>
                        <strong className="block text-sm text-gray-500">Phone/Телефон</strong>
                        <p>{user.phoneNumber || '—'}</p>
                    </div>
                    <div>
                        <strong className="block text-sm text-gray-500">Email/Емейл</strong>
                        <p>{user.email || '—'}</p>
                    </div>
                    <div>
                        <strong className="block text-sm text-gray-500">Rights/Права</strong>
                        <p>{user.rights || '—'}</p>
                    </div>
                    <div>
                        <strong className="block text-sm text-gray-500">
                            Conscription Info/Інфо
                        </strong>
                        <p>{user.conscriptionInfo || '—'}</p>
                    </div>
                </div>

                <UserRelatives relatives={user.relatives} />

                {/* Pass onAddHistory to UserHistory */}
                <UserHistory
                    history={user.history}
                    onAddHistory={handleAddHistory}
                    onDeleteHistory={handleDeleteHistory}
                />
            </div>

            {/* Edit User Modal */}
            {editUser && <UserFormModal userToEdit={editUser} onClose={() => setEditUser(null)} />}

            {/* Comments Modal */}
            {showComments && (
                <CommentsModal comments={user.comments} onClose={() => setShowComments(false)} />
            )}
        </aside>
    );
}
