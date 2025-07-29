import { useState, useMemo } from 'react';
import type { CommentOrHistoryEntry } from '../../types/user';
import HistoryItem from './HistoryItem';
import AddHistoryModal from './AddHistoryModal';
import { useI18nStore } from '../../stores/i18nStore';
import { HistoryHeader } from '../HistoryHeader';
import { StatusExcel } from '../../utils/excelUserStatuses';
import { useIncompleteHistoryStore } from '../../stores/useIncompleteHistoryStore';

type FileWithDataUrl = { name: string; type: string; dataUrl: string };

type UserHistoryProps = {
    history: CommentOrHistoryEntry[];
    userId: number;
    onAddHistory: (entry: CommentOrHistoryEntry, maybeNewStatus?: StatusExcel) => void;
    onDeleteHistory: (id: number) => void;
    onStatusChange: (status: StatusExcel) => void;
    currentStatus?: string;
    refreshHistory: () => void;
};

export default function UserHistory({
    history,
    userId,
    onAddHistory,
    onDeleteHistory,
    onStatusChange,
    currentStatus,
    refreshHistory,
}: UserHistoryProps) {
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<FileWithDataUrl[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<CommentOrHistoryEntry | null>(null);
    const [initialPeriod, setInitialPeriod] = useState<{ from: string; to: string } | undefined>();

    const { t } = useI18nStore();

    const filteredHistory = useMemo(() => {
        const sorted = [...history].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        if (!searchTerm.trim()) return sorted;

        const term = searchTerm.toLowerCase();

        return sorted.filter((entry) => {
            const matchesBasicFields =
                [entry.description, entry.author, new Date(entry.date).toLocaleDateString()].some(
                    (f) => f?.toLowerCase().includes(term),
                ) || entry.files?.some((file) => file.name.toLowerCase().includes(term));

            const isIncomplete =
                entry.type === 'statusChange' &&
                (!entry.period || !entry.files || entry.files.length === 0);

            const matchesMissingHint =
                isIncomplete && ['відсутній', 'файл', 'період'].some((w) => w.startsWith(term));

            return matchesBasicFields || matchesMissingHint;
        });
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
        if (editingEntry) {
            // ✅ Edit existing
            const updated: CommentOrHistoryEntry = {
                ...editingEntry,
                description: desc.trim(),
                files: attachedFiles,
                type: maybeNewStatus ? 'statusChange' : editingEntry.type,
                period: period || undefined,
            };

            await window.electronAPI.editUserHistory(userId, updated);
            if (refreshHistory) refreshHistory();
        } else {
            // ✅ Add new
            const prevStatus = currentStatus || '—';
            const statusInfo =
                maybeNewStatus && maybeNewStatus !== prevStatus
                    ? `✅ Статус змінено з "${prevStatus}" → "${maybeNewStatus}"`
                    : '';
            const combinedDescription = [statusInfo, desc.trim()].filter(Boolean).join('\n');

            const newEntry: CommentOrHistoryEntry = {
                id: Date.now(),
                date: new Date().toISOString(),
                type: maybeNewStatus ? 'statusChange' : 'history',
                author: 'You',
                description: combinedDescription,
                content: '',
                files: attachedFiles,
                period: period || undefined,
            };

            onAddHistory(newEntry, maybeNewStatus);
        }

        // ✅ reset
        setIsModalOpen(false);
        setEditingEntry(null);
        setDescription('');
        setFiles([]);
    };

    return (
        <div className="relative">
            <HistoryHeader
                onAddHistory={openAddModal}
                currentStatus={currentStatus}
                onStatusChange={onStatusChange}
            />

            <div className="flex justify-end mb-4">
                <input
                    type="text"
                    placeholder={t('history.searchPlaceholder')}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredHistory.length === 0 ? (
                <p className="text-gray-500 italic">{t('history.noRecords')}</p>
            ) : (
                <ul className="space-y-4">
                    {filteredHistory.map((entry) => (
                        <HistoryItem
                            key={entry.id}
                            entry={entry}
                            onDelete={onDeleteHistory}
                            onEdit={openEditModal}
                        />
                    ))}
                </ul>
            )}

            <AddHistoryModal
                isOpen={isModalOpen}
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
