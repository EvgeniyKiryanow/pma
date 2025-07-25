import { useState } from 'react';
import { useUserStore } from '../stores/userStore';
import type { User, CommentOrHistoryEntry } from '../types/user';
import UserInfoDetails from '../components/userInfo/UserInfoDetails';
import UserHistory from '../components/userInfo/UserHistory';
import CommentsModal from '../components/userInfo/CommentsModal';
import { Edit3, MessageCircle, Trash2, ClipboardList } from 'lucide-react';
import { useI18nStore } from '../stores/i18nStore';

export default function RightBar() {
    const [showComments, setShowComments] = useState(false);
    const [dbComments, setDbComments] = useState<CommentOrHistoryEntry[]>([]);
    const sidebarCollapsed = useUserStore((s) => s.sidebarCollapsed);
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
            {/* === HEADER BUTTONS === */}
            <section className="sticky top-0 z-10 bg-white pt-4 pb-3 border-b mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => openUserFormForEdit(user)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow"
                    >
                        <Edit3 className="w-4 h-4" /> {t('rightBar.edit')}
                    </button>
                    <button
                        onClick={handleShowComments}
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

            {/* ✅ Dynamic layout: 2 columns if leftbar hidden */}
            <div
                className={`pb-10 gap-6 ${
                    sidebarCollapsed
                        ? 'grid grid-cols-1 lg:grid-cols-2 max-w-full' // 2 columns
                        : 'max-w-3xl mx-auto space-y-8' // single column
                }`}
            >
                {/* === COLUMN 1: All user info (moved to new component) === */}
                <UserInfoDetails user={user} />

                {/* === COLUMN 2: History === */}
                <div className="space-y-6">
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
            </div>

            {/* Comments modal */}
            {showComments && (
                <CommentsModal userId={user.id} onClose={() => setShowComments(false)} />
            )}
        </aside>
    );
}
