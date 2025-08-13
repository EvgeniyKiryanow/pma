import { Eye, Info, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useVyklyuchennyaStore } from '../../../../stores/useVyklyuchennyaStore';
import FilePreviewModal, { FileWithDataUrl } from '../../../shared/components/FilePreviewModal';
import { useUserStore } from '../../../stores/userStore';

export default function VyklyuchennyaModal({ onClose }: { onClose: () => void }) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [periodFrom, setPeriodFrom] = useState('');
    const [file, setFile] = useState<FileWithDataUrl | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    const user = useUserStore((s) => s.selectedUser);
    const updateUser = useUserStore((s) => s.updateUser);
    const addVyklyuchennya = useVyklyuchennyaStore((s) => s.addVyklyuchennya);

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

        // 1. Save to store
        addVyklyuchennya({
            id: uuidv4(),
            userId: user.id,
            title,
            description,
            periodFrom,
            file,
            date: new Date().toISOString(),
        });

        // 2. Add to history
        updateUser({
            ...user,
            shpkNumber: 'excluded',
            history: [
                ...(user.history || []),
                {
                    id: Date.now(),
                    type: 'exclude',
                    date: new Date().toISOString(),
                    author: 'System',
                    description: `Користувача виключено: ${title}`,
                    content: description,
                    files: [file],
                    period: { from: periodFrom, to: periodFrom },
                },
            ],
        });

        // 3. Close modal
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

                <h2 className="text-xl font-bold mb-3 text-gray-800">❌ Виключити користувача</h2>

                {/* Warning */}
                <div className="bg-red-50 border border-red-200 text-red-900 text-sm rounded-lg p-4 mb-5 flex gap-2">
                    <Info className="w-5 h-5 mt-0.5 shrink-0 text-red-800" />
                    <div>
                        Після підтвердження, користувача буде <strong>повністю виключено</strong> з
                        усіх баз даних та розрахунків. Цю дію не можна скасувати без відновлення
                        вручну.
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
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-red-300"
                            placeholder="Введіть заголовок"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Опис</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-red-300"
                            rows={3}
                            placeholder="Додатковий опис (необов’язково)"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Дата виключення <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={periodFrom}
                            onChange={(e) => setPeriodFrom(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-red-300"
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
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium shadow border border-red-200"
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
                                : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                    >
                        Підтвердити виключення
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
