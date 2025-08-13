import { useEffect, useMemo, useState } from 'react';

import FilePreviewModal from '../../../../components/FilePreviewModal';
import { HistoryHeader } from '../../../../components/HistoryHeader';
import { useI18nStore } from '../../../../stores/i18nStore';
import { useUserStore } from '../../../../stores/userStore';
import type { CommentOrHistoryEntry } from '../../../../types/user';
import { StatusExcel } from '../../../../utils/excelUserStatuses';
import AddHistoryModal from './AddHistoryModal';
import HistoryItem from './HistoryItem';

type FileWithDataUrl = { name: string; type: string; dataUrl: string };

type UserHistoryProps = {
    userId: number;
    onAddHistory: (entry: CommentOrHistoryEntry, maybeNewStatus?: StatusExcel) => void;
    onDeleteHistory: (id: number) => void;
    onStatusChange: (status: StatusExcel) => void;
    currentStatus?: string;
};

export default function UserHistory({
    userId,
    onAddHistory,
    onDeleteHistory,
    onStatusChange,
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
    const [dateRange, setDateRange] = useState<'1d' | '7d' | '30d' | 'all'>('1d');

    const user = useUserStore((s) => s.users.find((u) => u.id === userId));
    const isExcluded = user?.shpkNumber === 'excluded';
    const { t } = useI18nStore();

    const refreshHistory = async () => {
        const result = await window.electronAPI.getUserHistoryByRange(userId, dateRange);
        setHistory(result);
    };

    useEffect(() => {
        refreshHistory();
    }, [userId, dateRange]);

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
            console.warn('⚠️ Some files were missing dataUrl and skipped.');
        }

        if (editingEntry) {
            const existingFiles = editingEntry.files || [];
            const retainedMeta = existingFiles.filter((oldFile) =>
                attachedFiles.some((f) => f.name === oldFile.name && !f.dataUrl),
            );

            const retained: FileWithDataUrl[] = await Promise.all(
                retainedMeta.map(async (f) => {
                    try {
                        const loaded = await window.electronAPI.loadHistoryFile(
                            userId,
                            editingEntry.id,
                            f.name,
                        );
                        return { ...f, dataUrl: loaded.dataUrl };
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

            await window.electronAPI.editUserHistory(userId, updated);
            await refreshHistory();
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
        <div className="relative">
            <HistoryHeader
                onAddHistory={!isExcluded ? openAddModal : undefined}
                currentStatus={!isExcluded ? currentStatus : undefined}
                onStatusChange={!isExcluded ? onStatusChange : undefined}
                isExcluded={isExcluded}
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 px-4">
                <div className="flex-1 relative max-w-md">
                    <input
                        type="text"
                        placeholder={t('history.searchPlaceholder')}
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg
                        className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 21l-4.35-4.35M17 17A7.5 7.5 0 1010 17a7.5 7.5 0 007-7z"
                        />
                    </svg>
                </div>

                <div className="flex flex-wrap gap-2">
                    {[
                        { label: '1 день', value: '1d' },
                        { label: '7 днів', value: '7d' },
                        { label: 'Місяць', value: '30d' },
                        { label: 'Увесь час', value: 'all' },
                    ].map(({ label, value }) => (
                        <button
                            key={value}
                            onClick={() => setDateRange(value)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${
                                dateRange === value
                                    ? 'bg-blue-600 text-white border-blue-600 shadow'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}

            {filteredHistory.length === 0 ? (
                <p className="text-gray-500 italic">{t('history.noRecords')}</p>
            ) : (
                <div className="h-[80vh] overflow-y-auto px-4 pb-4 space-y-6 rounded-xl border border-gray-100 bg-gray-50 shadow-inner">
                    {filteredHistory.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4"
                        >
                            <HistoryItem
                                entry={item}
                                userId={user!.id}
                                onDelete={onDeleteHistory}
                                onEdit={openEditModal}
                                onPreviewFile={(file) => setPreviewFile(file)}
                            />
                        </div>
                    ))}
                </div>
            )}

            <AddHistoryModal
                isOpen={isModalOpen && !isExcluded}
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
        </div>
    );
}
