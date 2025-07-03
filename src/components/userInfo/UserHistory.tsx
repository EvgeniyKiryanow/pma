import { useState, useRef, useMemo } from 'react';
import type { CommentOrHistoryEntry } from '../../types/user';

type UserHistoryProps = {
    history: CommentOrHistoryEntry[];
    onAddHistory: (entry: CommentOrHistoryEntry) => void;
    onDeleteHistory: (id: number) => void;
};

type FileWithDataUrl = {
    name: string;
    type: string;
    dataUrl: string;
};

export default function UserHistory({ history, onAddHistory, onDeleteHistory }: UserHistoryProps) {
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<FileWithDataUrl[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        // if (!description.trim()) return alert('Please enter description');

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
    };

    // Filter history by search term (case-insensitive)
    const filteredHistory = useMemo(() => {
        if (!searchTerm.trim()) return history;

        const term = searchTerm.toLowerCase();

        return history.filter((entry) => {
            // Match description
            if (entry.description?.toLowerCase().includes(term)) return true;

            // Match author
            if (entry.author?.toLowerCase().includes(term)) return true;

            // Match date string
            if (new Date(entry.date).toLocaleDateString().toLowerCase().includes(term)) return true;

            // Match any file names inside files
            if (entry.files?.some((file) => file.name.toLowerCase().includes(term))) return true;

            return false;
        });
    }, [history, searchTerm]);

    return (
        <div className="mt-6">
            <h3 className="text-xl font-semibold mb-4">History</h3>

            {/* Search input */}
            <input
                type="text"
                placeholder="Search history by description, author, date, or file name..."
                className="mb-6 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-blue-500 focus:ring-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {filteredHistory.length === 0 ? (
                <p className="text-gray-500 italic">No history records found.</p>
            ) : (
                <ul className="space-y-4">
                    {filteredHistory.map((h) => (
                        <li key={h.id} className="bg-gray-100 p-4 rounded shadow relative">
                            <button
                                onClick={() => onDeleteHistory(h.id)}
                                className="absolute top-2 right-2 text-red-600 hover:text-red-900 font-bold text-lg"
                                title="Delete history entry"
                                type="button"
                            >
                                ×
                            </button>

                            <p className="text-sm text-gray-600 mb-1">
                                <strong>{h.type.toUpperCase()}</strong> —{' '}
                                {new Date(h.date).toLocaleDateString()}
                                {h.author && ` by ${h.author}`}
                            </p>

                            {h.description && <p className="font-medium mb-2">{h.description}</p>}

                            {h.files && h.files.length > 0 && (
                                <div className="flex flex-wrap gap-3">
                                    {h.files.map((file, i) => (
                                        <div
                                            key={i}
                                            className="border rounded p-2 max-w-[160px] max-h-[160px] flex flex-col items-center"
                                        >
                                            {file.dataUrl ? (
                                                file.type === 'application/pdf' ? (
                                                    <a
                                                        href={file.dataUrl}
                                                        download={file.name}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs underline text-blue-600"
                                                    >
                                                        PDF: {file.name}
                                                    </a>
                                                ) : file.type.startsWith('image/') ? (
                                                    <a
                                                        href={file.dataUrl}
                                                        download={file.name}
                                                        title={`Download ${file.name}`}
                                                    >
                                                        <img
                                                            src={file.dataUrl}
                                                            alt={file.name}
                                                            className="w-32 h-32 object-contain rounded"
                                                        />
                                                    </a>
                                                ) : (
                                                    <a
                                                        href={file.dataUrl}
                                                        download={file.name}
                                                        className="text-xs underline text-blue-600 break-words"
                                                    >
                                                        {file.name}
                                                    </a>
                                                )
                                            ) : (
                                                <span className="text-xs">{file.name}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {h.type === 'text' && h.content && (
                                <p className="text-blue-600 text-sm break-all">{h.content}</p>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* Add new history entry */}
            <div className="mt-8 p-6 border rounded bg-white shadow-sm">
                <h4 className="text-lg font-semibold mb-4">Add History Entry</h4>

                <label
                    htmlFor="history-description"
                    className="block mb-2 text-sm font-medium text-gray-700"
                >
                    Description
                </label>
                <textarea
                    id="history-description"
                    className="border border-gray-300 rounded px-3 py-2 w-full mb-4 resize-none focus:outline-blue-500 focus:ring-1"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter description..."
                />

                <label className="block mb-2 text-sm font-medium text-gray-700 cursor-pointer inline-flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 11-2.828-2.828L12.344 4"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
                        />
                    </svg>
                    Attach Files
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        accept="image/*,audio/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                    />
                </label>

                {files.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-4">
                        {files.map((file, i) => (
                            <div
                                key={i}
                                className="border rounded p-2 max-w-[80px] max-h-[80px] flex flex-col items-center relative bg-gray-50"
                            >
                                {file.type.startsWith('image/') ? (
                                    <img
                                        src={file.dataUrl}
                                        alt={file.name}
                                        className="w-16 h-16 object-contain rounded"
                                    />
                                ) : (
                                    <span className="text-xs text-center break-words px-1">
                                        {file.name}
                                    </span>
                                )}
                                <button
                                    onClick={() => removeFile(i)}
                                    className="absolute top-0 right-0 text-red-600 font-bold hover:text-red-900"
                                    title="Remove file"
                                    type="button"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <button
                onClick={handleSubmit}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow transition-colors"
            >
                Add History Entry
            </button>
        </div>
    );
}
