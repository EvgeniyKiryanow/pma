import { History, Plus, ScrollText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { CommentOrHistoryEntry } from '../../../../shared/types/user';
import { historyApi } from '../../../shared/api/personnel';
import FilePreviewModal from '../../../shared/components/FilePreviewModal';
import { Button, EmptyState, SearchInput, Tabs } from '../../../shared/ui';
import { StatusExcel } from '../../../shared/utils/excelUserStatuses';
import { useI18nStore } from '../../../stores/i18nStore';
import { usePermissions } from '../../../stores/sessionStore';
import { useUserStore } from '../../../stores/userStore';
import AddHistoryModal from './AddHistoryModal';
import HistoryItem from './HistoryItem';

type FileWithDataUrl = { name: string; type: string; dataUrl: string };
type DateRange = '1d' | '7d' | '30d' | 'all';

type UserHistoryProps = {
    userId: number;
    onAddHistory: (entry: CommentOrHistoryEntry, maybeNewStatus?: StatusExcel) => void;
    onDeleteHistory: (id: number) => void;
    onStatusChange: (status: StatusExcel) => void;
    currentStatus?: string;
};

const RANGES: { value: DateRange; label: string }[] = [
    { value: '1d', label: '1 день' },
    { value: '7d', label: '7 днів' },
    { value: '30d', label: 'Місяць' },
    { value: 'all', label: 'Увесь час' },
];

export default function UserHistory({
    userId,
    onAddHistory,
    onDeleteHistory,
    currentStatus,
}: UserHistoryProps) {
    const [history, setHistory] = useState<CommentOrHistoryEntry[]>([]);
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<FileWithDataUrl[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<CommentOrHistoryEntry | null>(null);
    const [initialPeriod, setInitialPeriod] = useState<{ from: string; to: string } | undefined>();
    const [previewFile, setPreviewFile] = useState<FileWithDataUrl | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>('1d');

    const user = useUserStore((s) => s.users.find((u) => u.id === userId));
    const historyVersion = useUserStore((s) => s.historyVersion);
    const isExcluded = user?.shpkNumber === 'excluded';
    const { t } = useI18nStore();
    const { can, canAny } = usePermissions();
    // Mirrors the main-process rules: adding needs history.edit or personnel.edit,
    // changing or deleting existing entries needs history.edit.
    const canAdd = canAny('history.edit', 'personnel.edit') && !isExcluded;
    const canEdit = can('history.edit') && !isExcluded;

    const refreshHistory = async () => {
        const result = await historyApi.listByRange(userId, dateRange);
        setHistory(result);
    };

    useEffect(() => {
        void refreshHistory();
    }, [userId, dateRange, historyVersion]);

    const filteredHistory = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return [...history]
            .filter((entry) => {
                const matchesText =
                    [entry.description, entry.author].some((f) =>
                        f?.toLowerCase().includes(term),
                    ) ||
                    new Date(entry.date).toLocaleDateString('uk-UA').toLowerCase().includes(term) ||
                    entry.files?.some((file) => file.name.toLowerCase().includes(term));

                const isIncomplete =
                    entry.type === 'statusChange' &&
                    (!entry.period || !entry.files || entry.files.length === 0);

                const matchesHint =
                    isIncomplete && ['відсутній', 'файл', 'період'].some((w) => w.startsWith(term));

                return !term || matchesText || matchesHint;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [history, searchTerm]);

    const openAddModal = () => {
        setEditingEntry(null);
        setDescription('');
        setFiles([]);
        setInitialPeriod(undefined);
        setIsModalOpen(true);
    };

    const openEditModal = (entry: CommentOrHistoryEntry) => {
        setEditingEntry(entry);
        setDescription(entry.description || '');
        setFiles(entry.files || []);
        setInitialPeriod(entry.period);
        setIsModalOpen(true);
    };

    const handleSaveHistory = async (
        desc: string,
        attachedFiles: FileWithDataUrl[],
        maybeNewStatus?: StatusExcel,
        period?: { from: string; to: string },
    ) => {
        const newFiles = attachedFiles.filter((f) => !!f.dataUrl);

        if (newFiles.length !== attachedFiles.length) {
            console.warn('Some files were missing dataUrl and skipped.');
        }

        if (editingEntry) {
            const existingFiles = editingEntry.files || [];
            const retainedMeta = existingFiles.filter((oldFile) =>
                attachedFiles.some((f) => f.name === oldFile.name && !f.dataUrl),
            );

            const retained: FileWithDataUrl[] = await Promise.all(
                retainedMeta.map(async (f) => {
                    try {
                        const dataUrl = await historyApi.loadFile(userId, editingEntry.id, f.name);
                        return { ...f, dataUrl };
                    } catch {
                        return null;
                    }
                }),
            ).then((r) => r.filter(Boolean) as FileWithDataUrl[]);

            const updated: CommentOrHistoryEntry = {
                ...editingEntry,
                description: [
                    maybeNewStatus && maybeNewStatus !== currentStatus
                        ? `✅ Статус змінено з "${currentStatus}" → "${maybeNewStatus}"`
                        : '',
                    desc.trim(),
                ]
                    .filter(Boolean)
                    .join('\n'),
                files: [...retained, ...newFiles],
                type: maybeNewStatus ? 'statusChange' : editingEntry.type,
                period: period || undefined,
            };

            await historyApi.edit(userId, updated);
            // Also refreshes the "without file / period" counter in the title bar.
            await useUserStore.getState().refreshAfterChange();
        } else {
            const prevStatus = currentStatus || '—';
            const statusInfo =
                maybeNewStatus && maybeNewStatus !== prevStatus
                    ? `✅ Статус змінено з "${prevStatus}" → "${maybeNewStatus}"`
                    : '';

            const newEntry: CommentOrHistoryEntry = {
                id: Date.now(),
                date: new Date().toISOString(),
                type: maybeNewStatus ? 'statusChange' : 'history',
                author: 'You',
                description: [statusInfo, desc.trim()].filter(Boolean).join('\n'),
                content: '',
                files: newFiles,
                period: period || undefined,
            };

            onAddHistory(newEntry, maybeNewStatus);
        }

        setIsModalOpen(false);
        setEditingEntry(null);
        setDescription('');
        setFiles([]);
    };

    return (
        <section className="card flex min-w-0 flex-col">
            <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line px-5 py-4">
                <div className="mr-auto flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary-ink">
                        <History className="size-[18px]" />
                    </span>
                    <div>
                        <h3 className="text-[15px] font-semibold leading-tight text-ink">
                            {t('history.title')}
                        </h3>
                        <p className="text-xs text-ink-3">
                            {filteredHistory.length} записів за обраний період
                        </p>
                    </div>
                </div>
                {canAdd && (
                    <Button size="sm" icon={<Plus className="size-4" />} onClick={openAddModal}>
                        {t('history.add')}
                    </Button>
                )}
            </header>

            <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
                <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder={t('history.searchPlaceholder')}
                    size="sm"
                    className="min-w-[200px] flex-1"
                />
                <Tabs variant="pills" value={dateRange} onChange={setDateRange} items={RANGES} />
            </div>

            {filteredHistory.length === 0 ? (
                <EmptyState
                    icon={<ScrollText />}
                    title={t('history.noRecords')}
                    description={
                        dateRange !== 'all'
                            ? 'Спробуйте обрати довший період — «Увесь час».'
                            : undefined
                    }
                />
            ) : (
                <ol className="px-5 pb-5 pt-5">
                    {filteredHistory.map((item) => (
                        <HistoryItem
                            key={item.id}
                            entry={item}
                            userId={userId}
                            canEdit={canEdit}
                            onDelete={onDeleteHistory}
                            onEdit={openEditModal}
                            onPreviewFile={(file) => setPreviewFile(file)}
                        />
                    ))}
                </ol>
            )}

            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}

            <AddHistoryModal
                isOpen={isModalOpen && !isExcluded}
                isEditing={Boolean(editingEntry)}
                currentStatus={currentStatus}
                onClose={() => setIsModalOpen(false)}
                description={description}
                setDescription={setDescription}
                files={files}
                initialPeriod={initialPeriod}
                setFiles={setFiles}
                removeFile={(idx) => setFiles((f) => f.filter((_, i) => i !== idx))}
                onSubmit={handleSaveHistory}
                onFileChange={(e) => {
                    if (!e.target.files) return;
                    Array.from(e.target.files).forEach((file) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            if (typeof reader.result === 'string') {
                                setFiles((prev) => [
                                    ...prev,
                                    {
                                        name: file.name,
                                        type: file.type,
                                        dataUrl: reader.result as string,
                                    },
                                ]);
                            }
                        };
                        reader.readAsDataURL(file);
                    });
                    e.target.value = '';
                }}
            />
        </section>
    );
}
