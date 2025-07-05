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
import { useI18nStore } from '../stores/i18nStore';

export default function RightBar() {
    const [showComments, setShowComments] = useState(false);
    const [search, setSearch] = useState('');
    const [dbComments, setDbComments] = useState<CommentOrHistoryEntry[]>([]);
    const { t } = useI18nStore();

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

    const handleShowComments = async () => {
        if (!user) return;
        const comments = await window.electronAPI.getUserComments(user.id);
        setDbComments(comments);
        setShowComments(true);
    };

    const handleDeleteUser = async () => {
        if (!user) return;
        const confirmed = confirm(`${t('rightBar.confirmDelete')} ${user.fullName}?`);
        if (!confirmed) return;
        await deleteUser(user.id);
        setSelectedUser(null);
    };

    if (!user) {
        return (
            <aside className="flex-1 bg-gray-50 p-8 text-gray-500 flex items-center justify-center">
                <p className="text-lg italic">{t('rightBar.selectPrompt')}</p>
            </aside>
        );
    }

    return (
        <aside className="flex-1 bg-white px-4 sm:px-6 md:px-10 shadow-inner overflow-y-auto max-h-[calc(100vh-56px)]">
            <section className="sticky top-0 z-10 bg-white pt-4 pb-3 border-b mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => openUserFormForEdit(user)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow"
                    >
                        <Edit3 className="w-4 h-4" /> {t('rightBar.edit')}
                    </button>
                    <button
                        onClick={() => setShowComments(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
                    >
                        <MessageCircle className="w-4 h-4" /> {t('rightBar.comments')}
                    </button>
                    <button
                        onClick={handleDeleteUser}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded shadow"
                    >
                        <Trash2 className="w-4 h-4" /> {t('rightBar.delete')}
                    </button>
                </div>
            </section>

            <div className="max-w-3xl mx-auto space-y-8 pb-10">
                <section><UserCard user={user} /></section>

                <section className="bg-gray-50 border rounded p-4 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                        <UserCircle className="w-5 h-5" /> {t('rightBar.basicInfo')}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                        <div>
                            <span className="block text-sm text-gray-500">{t('user.fullName')}</span>
                            <p>{user.fullName || '—'}</p>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500">{t('rightBar.dateOfBirth')}</span>
                            <p>{user.dateOfBirth || '—'}</p>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500 flex items-center gap-1">
                                <Phone className="w-4 h-4" /> {t('rightBar.phone')}
                            </span>
                            <p>{user.phoneNumber || '—'}</p>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="w-4 h-4" /> {t('rightBar.email')}
                            </span>
                            <p>{user.email || '—'}</p>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500">{t('user.position')}</span>
                            <p>{user.position || '—'}</p>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500">{t('user.rank')}</span>
                            <p>{user.rank || '—'}</p>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500 flex items-center gap-1">
                                <KeyRound className="w-4 h-4" /> {t('rightBar.rights')}
                            </span>
                            <p>{user.rights || '—'}</p>
                        </div>
                        <div className="sm:col-span-2">
                            <span className="block text-sm text-gray-500">{t('rightBar.education')}</span>
                            <p>{user.education || '—'}</p>
                        </div>
                        <div className="sm:col-span-2">
                            <span className="block text-sm text-gray-500">{t('rightBar.awards')}</span>
                            <p>{user.awards || '—'}</p>
                        </div>
                        <div className="sm:col-span-2">
                            <span className="block text-sm text-gray-500 flex items-center gap-1">
                                <Info className="w-4 h-4" /> {t('rightBar.conscriptionInfo')}
                            </span>
                            <p>{user.conscriptionInfo || '—'}</p>
                        </div>
                        <div className="sm:col-span-2">
                            <span className="block text-sm text-gray-500">{t('rightBar.notes')}</span>
                            <p>{user.notes || '—'}</p>
                        </div>
                    </div>
                </section>

                <section className="border rounded p-4 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                        <UserCircle className="w-5 h-5" /> {t('rightBar.relatives')}
                    </h2>
                    <UserRelatives relatives={user.relatives} />
                </section>

                <section className="border rounded p-4 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" /> {t('rightBar.history')}
                    </h2>
                    <UserHistory
                        userId={user.id}
                        onAddHistory={handleAddHistory}
                        onDeleteHistory={handleDeleteHistory}
                    />
                </section>
            </div>

            {showComments && (
                <CommentsModal userId={user.id} onClose={() => setShowComments(false)} />
            )}
        </aside>
    );
}

