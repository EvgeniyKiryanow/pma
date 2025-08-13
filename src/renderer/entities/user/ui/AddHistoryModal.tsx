import { FileText, Image as ImageIcon, Paperclip, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import FilePreviewModal from '../../../shared/components/FilePreviewModal';
import { StatusExcel } from '../../../shared/utils/excelUserStatuses';
import { useI18nStore } from '../../../stores/i18nStore';

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
    onSubmit: (
        description: string,
        files: FileWithDataUrl[],
        maybeNewStatus?: StatusExcel,
        period?: { from: string; to: string },
    ) => void; // ✅ always returns 3 values
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    currentStatus?: string;
    initialPeriod?: { from: string; to: string };
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
    currentStatus = '',
    initialPeriod,
}: AddHistoryModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useI18nStore();
    const [newStatus, setNewStatus] = useState<string>('');
    const [previewFile, setPreviewFile] = useState<FileWithDataUrl | null>(null);
    const [period, setPeriod] = useState<{ from: string; to: string }>({ from: '', to: '' });

    useEffect(() => {
        if (initialPeriod) {
            setPeriod(initialPeriod);
        }
    }, [initialPeriod]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSubmit(description, files, newStatus ? (newStatus as StatusExcel) : undefined, period);
        setNewStatus('');
        setPeriod(initialPeriod || { from: '', to: '' });
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-3xl max-h-screen bg-white rounded-xl shadow-2xl animate-fade-in flex flex-col">
                {/* === HEADER === */}
                <div className="flex justify-between items-center px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-blue-100">
                    <h2 className="text-xl font-bold text-gray-800">{t('historyModal.title')}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-red-500 transition"
                        title={t('historyModal.close')}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* === CONTENT === */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* ✅ STATUS DROPDOWN */}
                    <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700 flex items-center gap-2">
                            Зміна статусу
                        </label>
                        <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm hover:border-blue-400 focus:border-blue-500 focus:ring focus:ring-blue-200 transition"
                            value={newStatus || ''}
                            onChange={(e) => setNewStatus(e.target.value)}
                        >
                            <option value="">
                                {currentStatus || t('historyItem.changeStatus')}
                            </option>
                            {Object.values(StatusExcel).map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* ✅ PERIOD RANGE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* FROM DATE */}
                        <div className="flex flex-col">
                            <label
                                htmlFor="period-from"
                                className="mb-1 text-sm font-medium text-gray-600"
                            >
                                📅 Період з
                            </label>
                            <input
                                id="period-from"
                                type="date"
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200/50 transition"
                                value={period.from}
                                onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
                            />
                        </div>

                        {/* TO DATE */}
                        <div className="flex flex-col">
                            <label
                                htmlFor="period-to"
                                className="mb-1 text-sm font-medium text-gray-600"
                            >
                                🗓️ Період по
                            </label>
                            <input
                                id="period-to"
                                type="date"
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200/50 transition"
                                value={period.to}
                                onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* ✅ DESCRIPTION */}
                    <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                            {t('historyModal.description')}
                        </label>
                        <textarea
                            rows={4}
                            className="border border-gray-300 rounded-lg px-4 py-3 w-full resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('historyModal.descriptionPlaceholder')}
                        />
                    </div>

                    {/* ✅ FILE UPLOAD */}
                    <div>
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow transition"
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
                            accept=".doc,.docx,.xls,.xlsx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,image/*"
                            className="hidden"
                        />
                    </div>

                    {/* ✅ FILE PREVIEW */}
                    {files.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {files.map((file, i) => (
                                <div
                                    key={i}
                                    className="relative border rounded-lg overflow-hidden bg-gray-50 shadow hover:shadow-md transition"
                                >
                                    {file.type.startsWith('image/') ? (
                                        <img
                                            src={file.dataUrl}
                                            alt={file.name}
                                            className="w-full h-32 object-cover cursor-pointer"
                                            onClick={() => setPreviewFile(file)}
                                        />
                                    ) : (
                                        <button
                                            onClick={() => setPreviewFile(file)}
                                            className="flex flex-col items-center justify-center h-32 w-full text-gray-600 text-sm p-2 hover:bg-gray-100 transition"
                                            title="Переглянути файл"
                                        >
                                            {file.type === 'application/pdf' ? (
                                                <FileText className="w-6 h-6 mb-1" />
                                            ) : (
                                                <ImageIcon className="w-6 h-6 mb-1" />
                                            )}
                                            <span className="truncate max-w-[90%]">
                                                {file.name}
                                            </span>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => removeFile(i)}
                                        className="absolute top-2 right-2 bg-white/70 hover:bg-red-100 text-red-600 rounded-full p-1 shadow"
                                        title={t('historyModal.remove')}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {previewFile && (
                    <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
                )}

                {/* === FOOTER === */}
                <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50">
                    {newStatus && (
                        <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            {t('historyModal.statusWillChange')} з {currentStatus} → {newStatus}
                        </span>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-200 transition"
                        >
                            {t('historyModal.cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow font-medium transition"
                        >
                            {t('historyModal.save')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
