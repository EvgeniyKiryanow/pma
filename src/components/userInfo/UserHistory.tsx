import { useState, useRef, useMemo, useEffect } from 'react';
import type { CommentOrHistoryEntry } from '../../types/user';
import HistoryItem from './HistoryItem';
import AddHistoryModal from './AddHistoryModal';
import { useI18nStore } from '../../stores/i18nStore';
import { HistoryHeader } from '../HistoryHeader'; // ✅ bring the nice header
import { StatusExcel } from '../../types/excelUserStatuses';

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
    userId: number;
    onAddHistory: (entry: CommentOrHistoryEntry) => void;
    onDeleteHistory: (id: number) => void;
    onStatusChange: (status: StatusExcel) => void; // ✅ new
    currentStatus?: string;
};

export default function UserHistory({
    userId,
    onAddHistory,
    onDeleteHistory,
    onStatusChange,
    currentStatus,
}: UserHistoryProps) {
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<FileWithDataUrl[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('30days');
    const [history, setHistory] = useState<CommentOrHistoryEntry[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { t } = useI18nStore();

    const loadHistory = async () => {
        const data = await window.electronAPI.getUserHistory(userId, selectedFilter);
        setHistory(data);
    };

    useEffect(() => {
        loadHistory();
    }, [userId, selectedFilter]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const fileList = Array.from(e.target.files);

        fileList.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    setFiles((prev) => [
                        ...prev,
                        { name: file.name, type: file.type, dataUrl: reader.result as string },
                    ]);
                }
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const handleDeleteHistory = async (id: number) => {
        const confirmed = window.confirm(t('history.confirmDelete'));
        if (!confirmed) return;

        await window.electronAPI.deleteUserHistory(id);
        await loadHistory();
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

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

        try {
            await window.electronAPI.addUserHistory(userId, newEntry);
            const refreshed = await window.electronAPI.getUserHistory(userId, selectedFilter);
            setHistory(refreshed);

            setDescription('');
            setFiles([]);
            setIsModalOpen(false);
        } catch (err) {
            console.error('Failed to save history:', err);
            alert(t('history.saveError'));
        }
    };

    const filteredHistory = useMemo(() => {
        if (!searchTerm.trim()) return [...history].reverse(); // ✅ latest first
        const term = searchTerm.toLowerCase();
        return [...history]
            .reverse()
            .filter(
                (entry) =>
                    [
                        entry.description,
                        entry.author,
                        new Date(entry.date).toLocaleDateString(),
                    ].some((field) => field?.toLowerCase().includes(term)) ||
                    entry.files?.some((file) => file.name.toLowerCase().includes(term)),
            );
    }, [history, searchTerm]);

    return (
        <div className="relative">
            {/* ✅ Cool unified header with dropdown + add record */}
            <HistoryHeader
                onAddHistory={() => setIsModalOpen(true)}
                currentStatus={currentStatus}
                onStatusChange={onStatusChange} // ✅ triggers upward
            />

            {/* Filters and search */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
                <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="px-3 py-2 border text-sm rounded shadow-sm focus:outline-blue-500"
                >
                    {FILTER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
                        </option>
                    ))}
                </select>

                <input
                    type="text"
                    placeholder={t('history.searchPlaceholder')}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-blue-500 focus:ring-1"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* History List */}
            {filteredHistory.length === 0 ? (
                <p className="text-gray-500 italic">{t('history.noRecords')}</p>
            ) : (
                <ul className="space-y-4">
                    {filteredHistory.map((entry) => (
                        <HistoryItem key={entry.id} entry={entry} onDelete={handleDeleteHistory} />
                    ))}
                </ul>
            )}

            {/* Modal for add */}
            <AddHistoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                description={description}
                setDescription={setDescription}
                files={files}
                setFiles={setFiles}
                removeFile={removeFile}
                onSubmit={handleSubmit}
                onFileChange={handleFileChange}
            />
        </div>
    );
}
