import { FileClock, LayoutList, Paperclip, Table2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import FilePreviewModal, { FileWithDataUrl } from '../../../shared/components/FilePreviewModal';
import { Button, EmptyState, formatDate, IconButton, Tabs } from '../../../shared/ui';
import { confirmAction } from '../../../shared/ui/confirm';
import { usePermissions } from '../../../stores/sessionStore';
import { useUserStore } from '../../../stores/userStore';
import { useRozporyadzhennyaStore } from '../model/useRozporyadzhennyaStore';
import LeftBar from './LeftBar';
import RightBar from './RightBar';

export default function RozporyadzhennyaTab() {
    const { entries, fetchAll, removeEntry, clearAllEntries } = useRozporyadzhennyaStore();
    const [previewFile, setPreviewFile] = useState<FileWithDataUrl | null>(null);
    const { users } = useUserStore();
    const { can } = usePermissions();
    const canEdit = can('directives.edit');
    const orderedUsers = users.filter((u) => u.shpkNumber?.toString().includes('order'));
    const [activeView, setActiveView] = useState<'table' | 'bars'>('table');

    useEffect(() => {
        void fetchAll();
    }, []);

    const handleDeleteEntry = async (userId: number, date: string) => {
        const confirmed = await confirmAction({
            title: 'Видалити запис розпорядження?',
            message: 'Запис буде прибрано з цього списку.',
            confirmLabel: 'Видалити',
            tone: 'danger',
        });
        if (confirmed) await removeEntry(userId, date);
    };

    const handleDeleteAll = async () => {
        const confirmed = await confirmAction({
            title: 'Видалити всі розпорядження?',
            message: 'Список розпоряджень буде повністю очищено. Цю дію не можна скасувати.',
            confirmLabel: 'Видалити всі',
            tone: 'danger',
        });
        if (!confirmed) return;
        await clearAllEntries();
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
                            label: 'Список розпоряджень',
                            icon: <Table2 />,
                            count: entries.length,
                        },
                        {
                            value: 'bars',
                            label: 'Картки у розпорядженні',
                            icon: <LayoutList />,
                            count: orderedUsers.length,
                        },
                    ]}
                />
                {activeView === 'table' && entries.length > 0 && canEdit && (
                    <Button
                        variant="danger-soft"
                        size="sm"
                        icon={<Trash2 className="size-3.5" />}
                        onClick={() => void handleDeleteAll()}
                    >
                        Видалити всі
                    </Button>
                )}
            </div>

            {activeView === 'table' && (
                <div className="min-h-0 flex-1 px-5 pb-5">
                    {entries.length === 0 ? (
                        <div className="card">
                            <EmptyState
                                icon={<FileClock />}
                                title="Розпоряджень немає"
                                description="Подати розпорядження можна з картки військовослужбовця у вкладці «Штат / за списком»."
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
                                        <th>Дата</th>
                                        <th>Період</th>
                                        <th>Файл</th>
                                        {canEdit && <th className="w-12" />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((entry, index) => {
                                        const user = users.find((u) => u.id === entry.userId);
                                        return (
                                            <tr key={`${entry.userId}-${entry.date}-${index}`}>
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
                                                    {entry.period?.from
                                                        ? formatDate(entry.period.from)
                                                        : '—'}
                                                    {entry.period?.to
                                                        ? ` — ${formatDate(entry.period.to)}`
                                                        : ''}
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
                                                                void handleDeleteEntry(
                                                                    entry.userId,
                                                                    entry.date,
                                                                )
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
                    <LeftBar users={orderedUsers} />
                    <RightBar />
                </div>
            )}

            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}
        </div>
    );
}
