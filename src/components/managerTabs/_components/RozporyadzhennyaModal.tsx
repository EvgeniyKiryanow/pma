import { useRef, useState } from 'react';
import { X, Eye, UploadCloud, Info } from 'lucide-react';
import FilePreviewModal, { FileWithDataUrl } from '../../FilePreviewModal';
import { useUserStore } from '../../../stores/userStore';
import { CommentOrHistoryEntry, User } from '../../../types/user';
import { useRozporyadzhennyaStore } from '../../../stores/useRozporyadzhennyaStore';

export default function RozporyadzhennyaModal({ onClose }: { onClose: () => void }) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const user = useUserStore((s) => s.selectedUser);
    const updateUser = useUserStore((s) => s.updateUser);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [period, setPeriod] = useState({ from: '', to: '' });
    const [file, setFile] = useState<FileWithDataUrl | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const addRozporyadzhennya = useRozporyadzhennyaStore((s) => s.addEntry);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;

        const reader = new FileReader();
        reader.onload = () => {
            setFile({
                name: f.name,
                type: f.type,
                dataUrl: reader.result as string,
            });
        };
        reader.readAsDataURL(f);
    };

    const handleSubmit = async () => {
        if (!title || !period.from || !file || !user) return;

        const now = new Date().toISOString();

        // ✅ 1. Save into store instead of to disk
        addRozporyadzhennya({
            userId: user.id,
            title,
            description,
            period,
            file,
            date: now, // ✅ замість createdAt
        });

        // ✅ 2. Add to user history
        const historyEntry: CommentOrHistoryEntry = {
            id: Date.now(),
            type: 'order',
            date: now,
            author: 'System',
            description: `Подано розпорядження: ${title}`,
            content: description,
            files: [file],
            period,
        };

        updateUser({
            ...user,
            history: [...(user.history || []), historyEntry],
            shpkNumber: user.shpkNumber ? `${user.shpkNumber}_order` : 'order',
        });

        // ✅ 3. Close modal
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-2xl p-6 relative">
                {/* Close Button */}
                <button
                    className="absolute top-3 right-4 text-gray-500 hover:text-red-600 text-xl font-bold"
                    onClick={onClose}
                    title="Закрити"
                >
                    <X />
                </button>

                <h2 className="text-xl font-bold mb-3 text-gray-800">📤 Подати розпорядження</h2>

                {/* Description */}
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 text-sm rounded-lg p-4 mb-5 flex gap-2">
                    <Info className="w-5 h-5 mt-0.5 shrink-0 text-yellow-800" />
                    <div>
                        Після подачі розпорядження, статус користувача буде оновлено, і він
                        автоматично <strong>виключиться з підрахунку БЧС</strong>. Додайте файл з
                        підтвердженням або наказом.
                    </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Заголовок <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            placeholder="Введіть заголовок"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Опис</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            rows={3}
                            placeholder="Додатковий опис"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Період: з <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={period.from}
                                onChange={(e) => setPeriod({ ...period, from: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">до</label>
                            <input
                                type="date"
                                value={period.to}
                                onChange={(e) => setPeriod({ ...period, to: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                        </div>
                    </div>
                    {user?.soldierStatus && (
                        <div className="mb-4 px-4 py-2 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm font-medium">
                            Поточний статус:{' '}
                            <span className="font-semibold">{user.soldierStatus}</span>
                        </div>
                    )}

                    {/* Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Файл підтвердження <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium shadow border border-blue-200"
                        >
                            <UploadCloud className="w-4 h-4" />
                            Вибрати файл
                        </button>

                        {file && (
                            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <span className="text-sm text-gray-700 break-all">{file.name}</span>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowPreview(true)}
                                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                                    >
                                        <Eye className="w-4 h-4" /> Переглянути
                                    </button>
                                    <button
                                        onClick={() => setFile(null)}
                                        className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm"
                                    >
                                        🗑 Видалити файл
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit */}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={!title || !period.from || !file}
                        className={`px-6 py-2 rounded-lg shadow font-medium text-sm transition ${
                            !title || !period.from || !file
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        Вивести в розпорядження
                    </button>
                </div>
            </div>

            {/* File Preview */}
            {showPreview && file && (
                <FilePreviewModal file={file} onClose={() => setShowPreview(false)} />
            )}
        </div>
    );
}
