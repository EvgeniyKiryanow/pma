import { useState } from 'react';
import { useUserStore } from '../../stores/userStore';
import type { User, CommentOrHistoryEntry } from '../../types/user';
import UserInfoDetails from '../userInfo/UserInfoDetails';
import UserHistory from '../userInfo/UserHistory';
import CommentsModal from '../userInfo/CommentsModal';
import { Edit3, MessageCircle, Trash2 } from 'lucide-react';
import { useI18nStore } from '../../stores/i18nStore';
import { StatusExcel } from '../../utils/excelUserStatuses';
import UserStatisticsDrawer from '../UserStatisticsDrawer';
import RozporyadzhennyaModal from './_components/RozporyadzhennyaModal';
import VyklyuchennyaModal from './_components/VyklyuchennyaModal';
import VidnovytyModal from './_components/VidnovytyModal';

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
            <aside className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 p-8 text-gray-500 flex items-center justify-center">
                <p className="text-lg italic">{t('rightBar.selectPrompt')}</p>
            </aside>
        );
    }

    return (
        <aside className="flex-1 bg-gradient-to-b from-white via-gray-50 to-gray-100 shadow-inner overflow-y-auto max-h-[calc(100vh-56px)]">
            {/* === HEADER ACTIONS === */}
            <section className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-gray-200 shadow-sm flex flex-wrap justify-between items-center gap-3 px-4 py-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowOrderModal(true)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg shadow-sm transition bg-blue-500 hover:bg-blue-600 text-white"
                    >
                        📤 Подати розпорядження
                    </button>
                    <button
                        onClick={() => setShowExcludeModal(true)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg shadow-sm transition bg-red-500 hover:bg-red-600 text-white"
                    >
                        ❌ Виключити
                    </button>

                    <button
                        onClick={() => setShowRestoreModal(true)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg shadow-sm transition bg-green-500 hover:bg-green-600 text-white"
                    >
                        ♻️ Відновити
                    </button>
                    <button
                        onClick={() => openUserFormForEdit(user)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg shadow-sm transition bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                        <Edit3 className="w-4 h-4" /> {t('rightBar.edit')}
                    </button>

                    <button
                        onClick={handleShowComments}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg shadow-sm transition bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <MessageCircle className="w-4 h-4" /> {t('rightBar.comments')}
                    </button>

                    <button
                        onClick={handleDeleteUser}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg shadow-sm transition bg-red-500 hover:bg-red-600 text-white"
                    >
                        <Trash2 className="w-4 h-4" /> {t('rightBar.delete')}
                    </button>
                    <button
                        onClick={() => setShowStatistics(true)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg shadow-sm transition bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        📊 {t('rightBar.statistics')}
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
