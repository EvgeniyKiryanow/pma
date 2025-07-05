import { useRef } from 'react';
import { X, Paperclip } from 'lucide-react';
import type { CommentOrHistoryEntry } from '../../types/user';
import { useI18nStore } from '../../stores/i18nStore';

type FileWithDataUrl = {
    name: string;
    type: string;
    dataUrl: string;
};

type AddHistoryModalProps = {
    isOpen: boolean;
    onClose: () => void;
    description: string;
    setDescription: (val: string) => void;
    files: FileWithDataUrl[];
    setFiles: (val: FileWithDataUrl[]) => void;
    removeFile: (index: number) => void;
    onSubmit: () => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function AddHistoryModal({
    isOpen,
    onClose,
    description,
    setDescription,
    files,
    removeFile,
    onSubmit,
    onFileChange,
}: AddHistoryModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useI18nStore();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl p-8 relative animate-fade-in">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-red-600"
                    title={t('historyModal.close')}
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold mb-6 text-gray-800">{t('historyModal.title')}</h2>

                <div className="mb-6">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                        {t('historyModal.description')}
                    </label>
                    <textarea
                        rows={6}
                        className="border border-gray-300 rounded-lg px-4 py-3 w-full resize-none text-sm focus:outline-blue-500 focus:ring-1"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('historyModal.descriptionPlaceholder')}
                    />
                </div>

                <div className="mb-4">
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium px-4 py-2 rounded-md transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip className="w-4 h-4" />
                        {t('historyModal.attach')}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={onFileChange}
                        accept="image/*,audio/*,application/pdf"
                        className="hidden"
                    />
                </div>

                {files.length > 0 && (
                    <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {files.map((file, i) => (
                            <div
                                key={i}
                                className="relative border rounded-lg p-3 bg-gray-50 flex flex-col items-center text-center text-xs"
                            >
                                {file.type.startsWith('image/') ? (
                                    <img
                                        src={file.dataUrl}
                                        alt={file.name}
                                        className="w-full h-32 object-contain rounded"
                                    />
                                ) : (
                                    <span className="break-words">{file.name}</span>
                                )}
                                <button
                                    onClick={() => removeFile(i)}
                                    className="absolute top-1 right-1 text-red-600 hover:text-red-800 font-bold"
                                    title={t('historyModal.remove')}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        onClick={onSubmit}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow font-semibold text-sm transition-colors"
                    >
                        {t('historyModal.save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
