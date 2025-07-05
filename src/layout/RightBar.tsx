import { useState } from 'react';
import { useUserStore } from '../stores/userStore';
import type { User, CommentOrHistoryEntry } from '../types/user';
import UserCard from '../components/userInfo/UserCard';
import UserRelatives from '../components/userInfo/UserRelatives';
import UserHistory from '../components/userInfo/UserHistory';
import CommentsModal from '../components/userInfo/CommentsModal';

export default function RightBar() {
    const [showComments, setShowComments] = useState(false);

    const user = useUserStore((s) => s.selectedUser); // 👈 grab user from store
    const updateUser = useUserStore((s) => s.updateUser);
    const deleteUser = useUserStore((s) => s.deleteUser);
    const openUserFormForEdit = useUserStore((s) => s.openUserFormForEdit);
    const setSelectedUser = useUserStore((s) => s.setSelectedUser);

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

    const handleDeleteUser = async () => {
        if (!user) return;

        const confirmed = confirm(`Are you sure you want to delete ${user.fullName}?`);
        if (!confirmed) return;

        await deleteUser(user.id);
        setSelectedUser(null); // Clear user view after deletion
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
                <div className="flex justify-end gap-3 mb-6">
                    <button
                        onClick={() => openUserFormForEdit(user)}
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
                    <button
                        onClick={handleDeleteUser}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded shadow"
                    >
                        Delete / Видалити
                    </button>
                </div>

                <UserCard user={user} />
                <div className="space-y-4 text-gray-800">
                    <div>
                        <strong className="block text-sm text-gray-500">
                            Date of Birth/Дата народження
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
                <UserHistory
                    history={user.history}
                    onAddHistory={handleAddHistory}
                    onDeleteHistory={handleDeleteHistory}
                />
            </div>

            {showComments && (
                <CommentsModal comments={user.comments} onClose={() => setShowComments(false)} />
            )}
        </aside>
    );
}
