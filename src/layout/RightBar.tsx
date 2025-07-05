import { useState } from 'react';
import { useUserStore } from '../stores/userStore';
import type { User, CommentOrHistoryEntry } from '../types/user';
import UserCard from '../components/userInfo/UserCard';
import UserRelatives from '../components/userInfo/UserRelatives';
import UserHistory from '../components/userInfo/UserHistory';
import CommentsModal from '../components/userInfo/CommentsModal';
import {
    UserCircle,
    Phone,
    Mail,
    KeyRound,
    Info,
    ClipboardList,
    Edit3,
    MessageCircle,
    Trash2,
    Search,
} from 'lucide-react';

export default function RightBar() {
    const [showComments, setShowComments] = useState(false);
    const [search, setSearch] = useState('');

    const user = useUserStore((s) => s.selectedUser);
    const updateUser = useUserStore((s) => s.updateUser);
    const deleteUser = useUserStore((s) => s.deleteUser);
    const openUserFormForEdit = useUserStore((s) => s.openUserFormForEdit);
    const setSelectedUser = useUserStore((s) => s.setSelectedUser);

    const handleAddHistory = (newEntry: CommentOrHistoryEntry) => {
        if (!user) return;
        const updatedUser: User = { ...user, history: [...(user.history || []), newEntry] };
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
        setSelectedUser(null);
    };

    if (!user) {
        return (
            <aside className="flex-1 bg-gray-50 p-8 text-gray-500 flex items-center justify-center">
                <p className="text-lg italic">Select a user to see details</p>
            </aside>
        );
    }

    return (
        <aside className="flex-1 bg-white px-4 sm:px-6 md:px-10 overflow-y-auto shadow-inner">
            {/* Sticky Controls */}
            <section className="sticky top-0 z-10 bg-white pt-4 pb-3 border-b mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Buttons */}
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => openUserFormForEdit(user)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow"
                    >
                        <Edit3 className="w-4 h-4" /> Edit
                    </button>
                    <button
                        onClick={() => setShowComments(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
                    >
                        <MessageCircle className="w-4 h-4" /> Comments
                    </button>
                    <button
                        onClick={handleDeleteUser}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded shadow"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>
            </section>

            <div className="max-w-3xl mx-auto space-y-8 pb-10">
                {/* Card */}
                <section>
                    <UserCard user={user} />
                </section>

                {/* Basic Info */}
                <section className="bg-gray-50 border rounded p-4 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                        <UserCircle className="w-5 h-5" /> Basic Info / Основна Інформація
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                        <div>
                            <span className="block text-sm text-gray-500">Full Name / ПІБ</span>
                            <p>{user.fullName || '—'}</p>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500">
                                Date of Birth / Дата народження
                            </span>
                            <p>{user.dateOfBirth || '—'}</p>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500 flex items-center gap-1">
                                <Phone className="w-4 h-4" /> Phone / Телефон
                            </span>
                            <p>{user.phoneNumber || '—'}</p>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="w-4 h-4" /> Email / Емейл
                            </span>
                            <p>{user.email || '—'}</p>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500">Position / Посада</span>
                            <p>{user.position || '—'}</p>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500">Rank / Звання</span>
                            <p>{user.rank || '—'}</p>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500 flex items-center gap-1">
                                <KeyRound className="w-4 h-4" /> Rights / Права
                            </span>
                            <p>{user.rights || '—'}</p>
                        </div>
                        <div className="sm:col-span-2">
                            <span className="block text-sm text-gray-500 flex items-center gap-1">
                                <Info className="w-4 h-4" /> Conscription Info / Інфо про призов
                            </span>
                            <p>{user.conscriptionInfo || '—'}</p>
                        </div>
                        <div className="sm:col-span-2">
                            <span className="block text-sm text-gray-500">Notes / Нотатки</span>
                            <p>{user.notes || '—'}</p>
                        </div>
                    </div>
                </section>

                {/* Relatives */}
                <section className="border rounded p-4 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                        <UserCircle className="w-5 h-5" /> Relatives / Родичі
                    </h2>
                    <UserRelatives relatives={user.relatives} />
                </section>

                {/* History */}
                <section className="border rounded p-4 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" /> History / Історія
                    </h2>
                    <UserHistory
                        history={user.history}
                        onAddHistory={handleAddHistory}
                        onDeleteHistory={handleDeleteHistory}
                    />
                </section>
            </div>

            {showComments && (
                <CommentsModal comments={user.comments} onClose={() => setShowComments(false)} />
            )}
        </aside>
    );
}
