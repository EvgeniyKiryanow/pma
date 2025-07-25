import { useState, useRef, useMemo, useEffect } from 'react';
import type { CommentOrHistoryEntry } from '../../types/user';
import HistoryItem from './HistoryItem';
import AddHistoryModal from './AddHistoryModal';
import { useI18nStore } from '../../stores/i18nStore';
import { HistoryHeader } from '../HistoryHeader'; // ✅ bring the nice header
import { StatusExcel } from '../../utils/excelUserStatuses';

const FILTER_OPTIONS = [
    { labelKey: 'history.filters.1day', value: '1day' },
    { labelKey: 'history.filters.7days', value: '7days' },
    { labelKey: 'history.filters.14days', value: '14days' },
    { labelKey: 'history.filters.30days', value: '30days' },
    { labelKey: 'history.filters.all', value: 'all' },
];

type FileWithDataUrl = {
    name: string;
    type: string;
    dataUrl: string;
};

type UserHistoryProps = {
    history: CommentOrHistoryEntry[];
    userId: number;
    onAddHistory: (entry: CommentOrHistoryEntry) => void;
    onDeleteHistory: (id: number) => void;
    onStatusChange: (status: StatusExcel) => void; // ✅ new
    currentStatus?: string;
};

export default function UserHistory({
    history,
    onAddHistory,
    onDeleteHistory,
    onStatusChange,
    currentStatus,
}: UserHistoryProps) {
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<FileWithDataUrl[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('30days');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { t } = useI18nStore();

    const filteredHistory = useMemo(() => {
        const sorted = [...history].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        if (!searchTerm.trim()) return sorted;
        const term = searchTerm.toLowerCase();
        return sorted.filter(
            (entry) =>
                [entry.description, entry.author, new Date(entry.date).toLocaleDateString()].some(
                    (field) => field?.toLowerCase().includes(term),
                ) || entry.files?.some((file) => file.name.toLowerCase().includes(term)),
        );
    }, [history, searchTerm]);

    const handleSubmit = async () => {
        const newEntry: CommentOrHistoryEntry = {
            id: Date.now(),
            type: 'history',
            date: new Date().toISOString(),
            author: 'You',
            description,
            content: '',
            files,
        };
        onAddHistory(newEntry);
        setDescription('');
        setFiles([]);
        setIsModalOpen(false);
    };

    return (
        <div className="relative">
            <HistoryHeader
                onAddHistory={() => setIsModalOpen(true)}
                currentStatus={currentStatus}
                onStatusChange={onStatusChange}
            />

            {/* Filters/search */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
                <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="px-3 py-2 border text-sm rounded shadow-sm focus:outline-blue-500"
                >
                    {/* Filters can still exist but won’t refetch */}
                    <option value="30days">{t('history.filters.30days')}</option>
                    <option value="all">{t('history.filters.all')}</option>
                </select>

                <input
                    type="text"
                    placeholder={t('history.searchPlaceholder')}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-blue-500 focus:ring-1"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredHistory.length === 0 ? (
                <p className="text-gray-500 italic">{t('history.noRecords')}</p>
            ) : (
                <ul className="space-y-4">
                    {filteredHistory.map((entry) => (
                        <HistoryItem key={entry.id} entry={entry} onDelete={onDeleteHistory} />
                    ))}
                </ul>
            )}

            <AddHistoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                description={description}
                setDescription={setDescription}
                files={files}
                setFiles={setFiles}
                removeFile={(idx) => setFiles((f) => f.filter((_, i) => i !== idx))}
                onSubmit={handleSubmit}
                onFileChange={(e) => {
                    if (!e.target.files) return;
                    Array.from(e.target.files).forEach((file) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const result = reader.result;
                            if (typeof result === 'string') {
                                setFiles((prev) => [
                                    ...prev,
                                    {
                                        name: file.name,
                                        type: file.type,
                                        dataUrl: result,
                                    },
                                ]);
                            } else {
                                console.warn('Unexpected FileReader result type:', typeof result);
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
