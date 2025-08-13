import { Eye, Info, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';

import type { CommentOrHistoryEntry } from '../../../../shared/types/user';
import FilePreviewModal, { FileWithDataUrl } from '../../../shared/components/FilePreviewModal';
import { useUserStore } from '../../../stores/userStore';
import { useVidnovlennyaStore } from '../model/useVidnovlennyaStore';

export default function VidnovytyModal({ onClose }: { onClose: () => void }) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [periodFrom, setPeriodFrom] = useState('');
    const [file, setFile] = useState<FileWithDataUrl | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const user = useUserStore((s) => s.selectedUser);
    const updateUser = useUserStore((s) => s.updateUser);
    const addVidnovlennya = useVidnovlennyaStore((s) => s.addVidnovlennya);

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

    const handleSubmit = () => {
        if (!title || !file || !user) return;

        // ✅ 1. Save to store
        addVidnovlennya({
            userId: user.id,
            title,
            description,
            period: { from: periodFrom },
            file,
            date: new Date().toISOString(),
        });

        // ✅ 2. Add to history
        const historyEntry: CommentOrHistoryEntry = {
            id: Date.now(),
            type: 'restore',
            date: new Date().toISOString(),
            author: 'System',
            description: `Відновлено користувача: ${title}`,
            content: description,
            files: [file],
            period: { from: periodFrom, to: periodFrom },
        };

        updateUser({
            ...user,
            shpkNumber: String(user.shpkNumber || '').replace(/_(order|excluded)$/, ''),
            history: [...(user.history || []), historyEntry],
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

                <h2 className="text-xl font-bold mb-3 text-gray-800">♻️ Відновити користувача</h2>

                {/* Info Block */}
                <div className="bg-green-50 border border-green-200 text-green-900 text-sm rounded-lg p-4 mb-5 flex gap-2">
                    <Info className="w-5 h-5 mt-0.5 shrink-0 text-green-800" />
                    <div>
                        Після відновлення, користувача буде <strong>повернено до розрахунку</strong>{' '}
                        БЧС та всіх активних звітів. Обов’язково <strong>перевірте всі дані</strong>{' '}
                        користувача (посада, звання, статус, тощо) перед підтвердженням.
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Заголовок <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-300"
                            placeholder="Введіть заголовок"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Опис</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-300"
                            rows={3}
                            placeholder="Додатковий опис (необов’язково)"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Дата відновлення <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={periodFrom}
                            onChange={(e) => setPeriodFrom(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-300"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Підтверджуючий файл <span className="text-red-500">*</span>
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
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 text-sm font-medium shadow border border-green-200"
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
                        disabled={!title || !file}
                        className={`px-6 py-2 rounded-lg shadow font-medium text-sm transition ${
                            !title || !file
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                    >
                        Підтвердити відновлення
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
