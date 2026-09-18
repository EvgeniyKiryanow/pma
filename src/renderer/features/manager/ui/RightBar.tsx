import {
    BarChart2,
    MessageSquareText,
    MousePointerClick,
    Pencil,
    RotateCcw,
    Send,
    Trash2,
    UserX,
} from 'lucide-react';
import { useState } from 'react';

import type { CommentOrHistoryEntry } from '../../../../shared/types/user';
import CommentsModal from '../../../entities/user/ui/CommentsModal';
import UserCard from '../../../entities/user/ui/UserCard';
import UserHistory from '../../../entities/user/ui/UserHistory';
import UserInfoDetails from '../../../entities/user/ui/UserInfoDetails';
import UserStatisticsDrawer from '../../../entities/user/ui/UserStatisticsDrawer';
import { historyApi } from '../../../shared/api/personnel';
import { Button, EmptyState, IconButton } from '../../../shared/ui';
import { confirmAction } from '../../../shared/ui/confirm';
import { toast } from '../../../shared/ui/toast';
import { StatusExcel } from '../../../shared/utils/excelUserStatuses';
import { useI18nStore } from '../../../stores/i18nStore';
import { usePermissions } from '../../../stores/sessionStore';
import { useUserStore } from '../../../stores/userStore';
import RozporyadzhennyaModal from './RozporyadzhennyaModal';
import VidnovytyModal from './VidnovytyModal';
import VyklyuchennyaModal from './VyklyuchennyaModal';

/** Dossier of the selected service member: identity, actions, data and history. */
export default function RightBar() {
    const [showComments, setShowComments] = useState(false);
    const { t } = useI18nStore();
    const { can } = usePermissions();

    const user = useUserStore((s) => s.selectedUser);
    const updateUser = useUserStore((s) => s.updateUser);
    const deleteUser = useUserStore((s) => s.deleteUser);
    const openUserFormForEdit = useUserStore((s) => s.openUserFormForEdit);
    const setSelectedUser = useUserStore((s) => s.setSelectedUser);
    const refreshAfterChange = useUserStore((s) => s.refreshAfterChange);
    const [showStatistics, setShowStatistics] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [showExcludeModal, setShowExcludeModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);

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

        await historyApi.add(user.id, historyEntry);
        await updateUser({ ...user, soldierStatus: newStatus });
        await refreshAfterChange();
    };

    const handleAddHistory = async (
        newEntry: CommentOrHistoryEntry,
        maybeNewStatus?: StatusExcel,
    ) => {
        if (!user) return;
        // Attachments are written to disk by the main process; only their names stay in the entry.
        await historyApi.add(user.id, newEntry);
        if (maybeNewStatus && maybeNewStatus !== user.soldierStatus) {
            await updateUser({ ...user, soldierStatus: maybeNewStatus });
        }
        await refreshAfterChange();
        toast.success('Запис додано до історії');
    };

    const handleDeleteHistory = async (id: number) => {
        if (!user) return;
        await historyApi.remove(id);
        await refreshAfterChange();
    };

    const handleDeleteUser = async () => {
        if (!user) return;
        const confirmed = await confirmAction({
            title: 'Видалити військовослужбовця?',
            message: (
                <>
                    Картку <strong className="text-ink">{user.fullName}</strong> разом з історією
                    буде видалено з бази. Цю дію не можна скасувати.
                </>
            ),
            confirmLabel: t('rightBar.delete'),
            tone: 'danger',
        });
        if (!confirmed) return;
        await deleteUser(user.id);
        setSelectedUser(null);
        toast.success('Картку видалено');
    };

    if (!user) {
        return (
            <section className="flex min-w-0 flex-1 items-center justify-center p-8">
                <EmptyState
                    icon={<MousePointerClick />}
                    title="Оберіть військовослужбовця"
                    description="Натисніть на людину у списку ліворуч — тут відкриється картка з даними, історією та діями."
                />
            </section>
        );
    }

    const shpk = user.shpkNumber?.toString() ?? '';
    const isExcluded = user.shpkNumber === 'excluded';
    const isOnOrder = shpk.includes('order');

    const actions = (
        <>
            {!isExcluded && (
                <>
                    {can('personnel.edit') && (
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<Pencil className="size-3.5" />}
                            onClick={() => openUserFormForEdit(user)}
                        >
                            {t('rightBar.edit')}
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={<MessageSquareText className="size-3.5" />}
                        onClick={() => setShowComments(true)}
                    >
                        {t('rightBar.comments')}
                    </Button>
                </>
            )}
            <Button
                variant="secondary"
                size="sm"
                icon={<BarChart2 className="size-3.5" />}
                onClick={() => setShowStatistics(true)}
            >
                {t('rightBar.statistics')}
            </Button>

            <span className="flex-1" />

            {!isExcluded && can('directives.edit') && (
                <>
                    {!isOnOrder && (
                        <Button
                            variant="soft"
                            size="sm"
                            icon={<Send className="size-3.5" />}
                            onClick={() => setShowOrderModal(true)}
                        >
                            Подати розпорядження
                        </Button>
                    )}
                    {isOnOrder && (
                        <Button
                            variant="soft"
                            size="sm"
                            icon={<RotateCcw className="size-3.5" />}
                            onClick={() => setShowRestoreModal(true)}
                        >
                            Відновити
                        </Button>
                    )}
                    <Button
                        variant="danger-soft"
                        size="sm"
                        icon={<UserX className="size-3.5" />}
                        onClick={() => setShowExcludeModal(true)}
                    >
                        Виключити
                    </Button>
                </>
            )}
            {can('personnel.delete') && (
                <IconButton
                    label={t('rightBar.delete')}
                    size="sm"
                    variant="ghost"
                    className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                    onClick={() => void handleDeleteUser()}
                    icon={<Trash2 className="size-4" />}
                />
            )}
        </>
    );

    return (
        <section className="@container min-w-0 flex-1 overflow-y-auto">
            <header className="border-b border-line bg-surface px-6 pb-4 pt-5">
                <UserCard user={user} actions={actions} />
            </header>

            <div className="grid items-start gap-5 p-5 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <UserInfoDetails user={user} />
                <UserHistory
                    userId={user.id}
                    onAddHistory={handleAddHistory}
                    onDeleteHistory={handleDeleteHistory}
                    onStatusChange={handleStatusChange}
                    currentStatus={user.soldierStatus || ''}
                />
            </div>

            {showStatistics && (
                <UserStatisticsDrawer user={user} onClose={() => setShowStatistics(false)} />
            )}
            {showComments && (
                <CommentsModal userId={user.id} onClose={() => setShowComments(false)} />
            )}
            {showOrderModal && <RozporyadzhennyaModal onClose={() => setShowOrderModal(false)} />}
            {showExcludeModal && <VyklyuchennyaModal onClose={() => setShowExcludeModal(false)} />}
            {showRestoreModal && <VidnovytyModal onClose={() => setShowRestoreModal(false)} />}
        </section>
    );
}
