import { useState, useMemo, useEffect } from 'react';
import type { CommentOrHistoryEntry, User } from '../../types/user';
import { useUserStore } from '../../stores/userStore';

type CommentsModalProps = {
    onClose: () => void;
    userId: any;
};

type UploadedFile = {
    name: string;
    type: string;
    dataUrl?: string; // for preview
};

export default function CommentsModal({ userId, onClose }: CommentsModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [newComment, setNewComment] = useState('');
    const [author, setAuthor] = useState('');
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const updateUser = useUserStore((s) => s.updateUser);
    const selectedUser = useUserStore((s) => s.selectedUser);
    const [comments, setComments] = useState<CommentOrHistoryEntry[]>([]);
    useEffect(() => {
        const fetch = async () => {
            const res = await window.electronAPI.getUserComments(userId);
            setComments(res);
        };
        fetch();
    }, [userId]);
    // Filter comments by search term (author, content, file names)
    const filteredComments = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return comments;

        return comments.filter((c) => {
            const authorMatch = c.author?.toLowerCase().includes(term);
            const contentMatch = c.content?.toLowerCase().includes(term);
            const fileMatch = c.files?.some((f) => f.name.toLowerCase().includes(term)) ?? false;

            return authorMatch || contentMatch || fileMatch;
        });
    }, [comments, searchTerm]);

    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedUser) return;

        const newEntry: CommentOrHistoryEntry = {
            id: Date.now(),
            content: newComment.trim(),
            author: author || 'Anonymous',
            date: new Date().toISOString(),
            files,
            type: 'text',
        };

        await window.electronAPI.addUserComment(userId, newEntry);
        setComments((prev) => [...prev, newEntry]);
        setNewComment('');
        setAuthor('');
        setFiles([]);
    };
    const handleDeleteComment = async (id: number) => {
        const confirmed = window.confirm('Are you sure you want to delete this comment?');
        if (!confirmed) return;

        await window.electronAPI.deleteUserComment(id);
        setComments((prev) => prev.filter((c) => c.id !== id));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles) return;

        const filePromises: Promise<UploadedFile>[] = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];

            if (
                file.type.startsWith('image/') ||
                file.type === 'application/pdf' ||
                file.type === 'image/svg+xml'
            ) {
                filePromises.push(
                    new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            resolve({
                                name: file.name,
                                type: file.type,
                                dataUrl: reader.result as string,
                            });
                        };
                        reader.readAsDataURL(file);
                    }),
                );
            } else {
                filePromises.push(
                    Promise.resolve({
                        name: file.name,
                        type: file.type,
                    }),
                );
            }
        }

        Promise.all(filePromises).then((newFiles) => {
            setFiles((prev) => [...prev, ...newFiles]);
            e.target.value = '';
        });
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-xl rounded-lg shadow-2xl border border-gray-300 max-h-[80vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">User Comments / Коментарі</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-red-600 text-lg font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* Add New Comment */}
                <div className="mb-4 space-y-2">
                    <input
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="Author / Автор"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                    />
                    <textarea
                        className="w-full border rounded px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Write a comment... / Напишіть коментар..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    />

                    {/* File Upload */}
                    <div>
                        <label className="block mb-1 text-sm font-medium">
                            Attach files / Додати файли
                        </label>
                        <label
                            htmlFor="file-upload"
                            className="inline-block cursor-pointer rounded border border-gray-400 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:border-blue-500 transition"
                            title="Click to select files"
                        >
                            Select files
                        </label>
                        <input
                            id="file-upload"
                            type="file"
                            multiple
                            accept="image/*,application/pdf,image/svg+xml"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    {/* Files Preview */}
                    {files.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-3">
                            {files.map((file, i) => (
                                <div
                                    key={i}
                                    className="relative border rounded p-1 max-w-[100px] max-h-[100px] flex flex-col items-center cursor-default hover:shadow-lg transition-shadow"
                                >
                                    {file.dataUrl ? (
                                        file.type === 'application/pdf' ? (
                                            <div className="w-20 h-20 flex items-center justify-center bg-gray-200 text-xs text-gray-700 p-1 select-none">
                                                PDF Preview
                                            </div>
                                        ) : (
                                            <img
                                                src={file.dataUrl}
                                                alt={file.name}
                                                className="w-20 h-20 object-contain rounded select-none"
                                                draggable={false}
                                            />
                                        )
                                    ) : (
                                        <div className="w-20 h-20 flex items-center justify-center bg-gray-100 text-xs text-gray-600 p-1 text-center break-words select-none">
                                            {file.name}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 text-xs font-bold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                                        title="Remove file / Видалити файл"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={handleAddComment}
                        className="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                    >
                        Add Comment / Додати коментар
                    </button>
                </div>

                {/* Search input */}
                <input
                    type="text"
                    placeholder="Search comments by author, text or file name..."
                    className="mb-4 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-blue-500 focus:ring-1"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* Comments List */}
                {filteredComments.length === 0 ? (
                    <p className="text-gray-500">No comments available / Коментарів немає.</p>
                ) : (
                    <ul className="space-y-3">
                        {filteredComments.map((c) => (
                            <li key={c.id} className="bg-gray-100 p-3 rounded relative">
                                <p className="text-sm text-gray-600 mb-1">
                                    <span className="font-medium">{c.author || 'Anonymous'}</span> —{' '}
                                    {new Date(c.date).toLocaleString()}
                                </p>
                                <p className="text-gray-800">{c.content}</p>

                                {/* Show attached files */}
                                {c.files && c.files.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {c.files.map((file, i) => (
                                            <div
                                                key={i}
                                                className="border rounded p-1 max-w-[80px] max-h-[80px] flex flex-col items-center"
                                            >
                                                {file.dataUrl ? (
                                                    file.type === 'application/pdf' ? (
                                                        <a
                                                            href={file.dataUrl}
                                                            download={file.name}
                                                            className="text-xs underline text-blue-600"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            PDF: {file.name}
                                                        </a>
                                                    ) : (
                                                        <a
                                                            href={file.dataUrl}
                                                            download={file.name}
                                                            className="block"
                                                            title={`Download ${file.name}`}
                                                        >
                                                            <img
                                                                src={file.dataUrl}
                                                                alt={file.name}
                                                                className="w-16 h-16 object-contain rounded"
                                                            />
                                                        </a>
                                                    )
                                                ) : (
                                                    <span className="text-xs">{file.name}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button
                                    className="absolute top-2 right-2 text-red-500 text-xs hover:underline"
                                    onClick={() => handleDeleteComment(c.id)}
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
