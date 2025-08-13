import { Edit3, MessageCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { useI18nStore } from '../../../../stores/i18nStore';
import { useUserStore } from '../../../../stores/userStore';
import type { CommentOrHistoryEntry, User } from '../../../../types/user';
import { StatusExcel } from '../../../../utils/excelUserStatuses';
import CommentsModal from '../../../entities/user/ui/CommentsModal';
import UserHistory from '../../../entities/user/ui/UserHistory';
import UserInfoDetails from '../../../entities/user/ui/UserInfoDetails';
import UserStatisticsDrawer from '../../../entities/user/ui/UserStatisticsDrawer';
import RozporyadzhennyaModal from './RozporyadzhennyaModal';
import VidnovytyModal from './VidnovytyModal';
import VyklyuchennyaModal from './VyklyuchennyaModal';

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
    const [showStatistics, setShowStatistics] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [showExcludeModal, setShowExcludeModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);

    /** ✅ Refresh full user history from DB */
    const refreshHistory = async () => {
        if (!user) return;
        const freshHistory = await window.electronAPI.getUserHistory(user.id, 'all');
        updateUser({ ...user, history: freshHistory });
    };

    const handleStatusChange = async (newStatus: StatusExcel) => {
        if (!user) return;

        const prevStatus = user.soldierStatus || '—';

        const historyEntry: CommentOrHistoryEntry = {
            id: Date.now(),
            date: new Date().toISOString(),
            type: 'statusChange',
            author: 'System',
            description: `Статус змінено з "${prevStatus}" → "${newStatus}"`,
            content: `Статус змінено з "${prevStatus}" на "${newStatus}"`,
            files: [],
        };

        const updatedUser: User = {
            ...user,
            soldierStatus: newStatus,
            history: [...(user.history || []), historyEntry],
        };

        await updateUser(updatedUser);
        window.location.reload();
    };

    const handleAddHistory = (newEntry: CommentOrHistoryEntry, maybeNewStatus?: StatusExcel) => {
        if (!user) return;

        const updatedUser: User = {
            ...user,
            soldierStatus:
                maybeNewStatus && maybeNewStatus !== user.soldierStatus
                    ? maybeNewStatus
                    : user.soldierStatus,
            history: [...(user.history || []), newEntry],
        };

        updateUser(updatedUser);
        window.location.reload();
    };

    const handleDeleteHistory = (id: number) => {
        if (!user) return;
        const updatedUser: User = {
            ...user,
            history: (user.history || []).filter((h) => h.id !== id),
        };
        updateUser(updatedUser);
        window.location.reload();
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
            <aside className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 p-8 text-gray-500 flex items-center justify-center">
                <p className="text-lg italic">{t('rightBar.selectPrompt')}</p>
            </aside>
        );
    }

    return (
        <aside className="flex-1 bg-gradient-to-b from-white via-gray-50 to-gray-100 shadow-inner overflow-y-auto max-h-[calc(100vh-56px)]">
            {/* === HEADER ACTIONS === */}
            <section className="sticky top-0 z-20 backdrop-blur-md bg-white/90 border-b border-gray-200 shadow-sm px-4 py-3">
                <div className="flex flex-wrap gap-2 items-center">
                    {/* ✅ Only show if user is not excluded */}
                    {user.shpkNumber !== 'excluded' && (
                        <>
                            {!user.shpkNumber?.toString().includes('order') && (
                                <button
                                    onClick={() => setShowOrderModal(true)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-xl bg-blue-100 text-blue-800 hover:bg-blue-200 transition border border-blue-200"
                                >
                                    📤 Подати розпорядження
                                </button>
                            )}

                            <button
                                onClick={() => setShowExcludeModal(true)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-xl bg-red-100 text-red-800 hover:bg-red-200 transition border border-red-200"
                            >
                                ❌ Виключити
                            </button>
                            {user.shpkNumber?.toString().includes('order') && (
                                <button
                                    onClick={() => setShowRestoreModal(true)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-xl bg-green-100 text-green-800 hover:bg-green-200 transition border border-green-200"
                                >
                                    ♻️ Відновити
                                </button>
                            )}

                            <button
                                onClick={() => openUserFormForEdit(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200 transition"
                            >
                                <Edit3 className="w-4 h-4" /> Редагувати
                            </button>

                            <button
                                onClick={handleShowComments}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border border-indigo-200 transition"
                            >
                                <MessageCircle className="w-4 h-4" /> Коментарі
                            </button>
                        </>
                    )}

                    <button
                        onClick={handleDeleteUser}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl bg-red-200 text-red-900 hover:bg-red-300 border border-red-300 transition"
                    >
                        <Trash2 className="w-4 h-4" /> Видалити
                    </button>

                    <button
                        onClick={() => setShowStatistics(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-200 transition"
                    >
                        📊 Статистика
                    </button>
                </div>
            </section>

            {showStatistics && (
                <UserStatisticsDrawer user={user} onClose={() => setShowStatistics(false)} />
            )}

            {/* === MAIN CONTENT LAYOUT === */}
            <div
                className={`pb-10 p-4 gap-6 ${
                    sidebarCollapsed
                        ? 'grid grid-cols-1 lg:grid-cols-2 max-w-full'
                        : 'max-w-4xl mx-auto space-y-8'
                }`}
            >
                {/* === COLUMN 1: User Info Details === */}
                <div className="bg-white/80 rounded-xl shadow-md border border-gray-200 p-4 hover:shadow-lg transition">
                    <UserInfoDetails user={user} />
                </div>

                {/* === COLUMN 2: History === */}
                <div className="space-y-6">
                    <section className="bg-white/80 border rounded-xl shadow-md hover:shadow-lg transition p-4">
                        <UserHistory
                            userId={user.id}
                            history={user.history || []}
                            onAddHistory={handleAddHistory}
                            onDeleteHistory={handleDeleteHistory}
                            onStatusChange={handleStatusChange}
                            currentStatus={user.soldierStatus || ''}
                            refreshHistory={refreshHistory} // ✅ Pass refresh fn to UserHistory
                        />
                    </section>
                </div>
            </div>

            {/* Comments modal */}
            {showComments && (
                <CommentsModal userId={user.id} onClose={() => setShowComments(false)} />
            )}
            {showOrderModal && <RozporyadzhennyaModal onClose={() => setShowOrderModal(false)} />}
            {showExcludeModal && <VyklyuchennyaModal onClose={() => setShowExcludeModal(false)} />}
            {showRestoreModal && <VidnovytyModal onClose={() => setShowRestoreModal(false)} />}
        </aside>
    );
}
