import { LayoutList, Paperclip, Table2, Trash2, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';

import FilePreviewModal, { FileWithDataUrl } from '../../../shared/components/FilePreviewModal';
import { Button, EmptyState, formatDate, IconButton, Tabs } from '../../../shared/ui';
import { confirmAction } from '../../../shared/ui/confirm';
import { usePermissions } from '../../../stores/sessionStore';
import { useUserStore } from '../../../stores/userStore';
import { useVyklyuchennyaStore } from '../model/useVyklyuchennyaStore';
import LeftBar from './LeftBar';
import RightBar from './RightBar';

export default function VyklyucheniTab() {
    const { list, fetchAll, removeVyklyuchennya, clearAllVyklyuchennya } = useVyklyuchennyaStore();
    const users = useUserStore((s) => s.users);
    const excludedUsers = users.filter((u) => u.shpkNumber === 'excluded');
    const [previewFile, setPreviewFile] = useState<FileWithDataUrl | null>(null);
    const [activeView, setActiveView] = useState<'table' | 'bars'>('table');
    const { can } = usePermissions();
    const canEdit = can('directives.edit');

    useEffect(() => {
        void fetchAll();
    }, []);

    const handleDeleteAll = async () => {
        const confirmed = await confirmAction({
            title: 'Очистити список виключень?',
            message: 'Усі записи про виключення буде видалено з цього списку.',
            confirmLabel: 'Очистити',
            tone: 'danger',
        });
        if (!confirmed) return;
        await clearAllVyklyuchennya();
        await fetchAll();
    };

    const handleDeleteOne = async (id: number) => {
        const confirmed = await confirmAction({
            title: 'Видалити цей запис?',
            message: 'Запис про виключення буде прибрано зі списку.',
            confirmLabel: 'Видалити',
            tone: 'danger',
        });
        if (!confirmed) return;
        await removeVyklyuchennya(id);
        await fetchAll();
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
                <Tabs
                    variant="pills"
                    value={activeView}
                    onChange={setActiveView}
                    items={[
                        {
                            value: 'table',
                            label: 'Список виключень',
                            icon: <Table2 />,
                            count: list.length,
                        },
                        {
                            value: 'bars',
                            label: 'Картки виключених',
                            icon: <LayoutList />,
                            count: excludedUsers.length,
                        },
                    ]}
                />
                {activeView === 'table' && list.length > 0 && canEdit && (
                    <Button
                        variant="danger-soft"
                        size="sm"
                        icon={<Trash2 className="size-3.5" />}
                        onClick={() => void handleDeleteAll()}
                    >
                        Очистити список
                    </Button>
                )}
            </div>

            {activeView === 'table' && (
                <div className="min-h-0 flex-1 px-5 pb-5">
                    {list.length === 0 ? (
                        <div className="card">
                            <EmptyState
                                icon={<UserX />}
                                title="Виключених немає"
                                description="Виключити військовослужбовця можна з його картки у вкладці «Штат / за списком»."
                            />
                        </div>
                    ) : (
                        <div className="card h-full overflow-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th className="w-10">#</th>
                                        <th>Військовослужбовець</th>
                                        <th>Підрозділ</th>
                                        <th>Посада</th>
                                        <th>Назва</th>
                                        <th>Опис</th>
                                        <th>Дата запису</th>
                                        <th>Дата виключення</th>
                                        <th>Файл</th>
                                        {canEdit && <th className="w-12" />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.map((entry, index) => {
                                        const user = users.find((u) => u.id === entry.userId);
                                        return (
                                            <tr key={entry.id}>
                                                <td className="font-mono text-xs text-ink-3">
                                                    {index + 1}
                                                </td>
                                                <td className="font-medium">
                                                    {user?.fullName || '—'}
                                                </td>
                                                <td className="text-ink-2">
                                                    {user?.unitMain || '—'}
                                                </td>
                                                <td className="text-ink-2">
                                                    {user?.position || '—'}
                                                </td>
                                                <td>{entry.title}</td>
                                                <td className="max-w-[280px] whitespace-pre-wrap text-ink-2">
                                                    {entry.description || '—'}
                                                </td>
                                                <td className="whitespace-nowrap">
                                                    {formatDate(entry.date)}
                                                </td>
                                                <td className="whitespace-nowrap">
                                                    {entry.periodFrom
                                                        ? formatDate(entry.periodFrom)
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {entry.file ? (
                                                        <button
                                                            onClick={() =>
                                                                setPreviewFile(entry.file)
                                                            }
                                                            className="inline-flex max-w-[180px] items-center gap-1.5 text-primary-ink hover:underline"
                                                        >
                                                            <Paperclip className="size-3.5 shrink-0" />
                                                            <span className="truncate">
                                                                {entry.file.name}
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                {canEdit && (
                                                    <td className="text-right">
                                                        <IconButton
                                                            label="Видалити запис"
                                                            size="xs"
                                                            className="hover:bg-danger-soft hover:text-danger-ink"
                                                            onClick={() =>
                                                                void handleDeleteOne(entry.id)
                                                            }
                                                            icon={<Trash2 className="size-3.5" />}
                                                        />
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeView === 'bars' && (
                <div className="flex min-h-0 flex-1 border-t border-line">
                    <LeftBar users={excludedUsers} />
                    <RightBar />
                </div>
            )}

            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}
        </div>
    );
}
