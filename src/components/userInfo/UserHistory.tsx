import { useState, useRef, useMemo, useEffect } from 'react';
import type { CommentOrHistoryEntry } from '../../types/user';
import { Plus, X } from 'lucide-react';
import HistoryItem from './HistoryItem';
import AddHistoryModal from './AddHistoryModal';
// import clsx from 'clsx';

const FILTER_OPTIONS = [
    { label: '1 Day', value: '1day' },
    { label: '7 Days', value: '7days' },
    { label: '14 Days', value: '14days' },
    { label: '30 Days', value: '30days' },
    { label: 'All Time', value: 'all' },
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
};

export default function UserHistory({ userId, onAddHistory, onDeleteHistory }: UserHistoryProps) {
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<FileWithDataUrl[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('30days');
    const [history, setHistory] = useState<CommentOrHistoryEntry[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
    };

    const handleDeleteHistory = async (id: number) => {
        const confirmed = window.confirm('Are you sure you want to delete this history entry?');
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
            setHistory(refreshed); // 🔄 update history list

            setDescription('');
            setFiles([]);
            setIsModalOpen(false);
        } catch (err) {
            console.error('Failed to save history:', err);
            alert('Error saving history. Please try again.');
        }
    };

    const filteredHistory = useMemo(() => {
        if (!searchTerm.trim()) return history;
        const term = searchTerm.toLowerCase();
        return history.filter(
            (entry) =>
                [entry.description, entry.author, new Date(entry.date).toLocaleDateString()].some(
                    (field) => field?.toLowerCase().includes(term),
                ) || entry.files?.some((file) => file.name.toLowerCase().includes(term)),
        );
    }, [history, searchTerm]);

    return (
        <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">User History</h3>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="px-2 py-1 border text-sm rounded bg-white"
                    >
                        {FILTER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-1 text-sm px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded shadow"
                    >
                        <Plus className="w-4 h-4" /> Add History
                    </button>
                </div>
            </div>

            <input
                type="text"
                placeholder="Search by description, author, date, or file..."
                className="mb-6 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-blue-500 focus:ring-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* History List */}
            {filteredHistory.length === 0 ? (
                <p className="text-gray-500 italic">No history records found.</p>
            ) : (
                <ul className="space-y-4">
                    {filteredHistory.map((entry: any) => (
                        <HistoryItem key={entry.id} entry={entry} onDelete={handleDeleteHistory} />
                    ))}
                </ul>
            )}

            {/* Modal */}
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
