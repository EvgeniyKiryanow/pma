import { Download, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useI18nStore } from '../../../../stores/i18nStore';
import { useReportFilesStore } from '../../../../stores/reportFilesStore';

export default function YourSavedReportsTab() {
    const { t } = useI18nStore();
    const { files, loadFromDb, addFileFromDisk, removeFileById } = useReportFilesStore();

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadFromDb();
    }, []);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files);
        droppedFiles.forEach(addFileFromDisk);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
        selectedFiles.forEach(addFileFromDisk);
    };
    const handleDownload = async (filePath: string, name: string) => {
        try {
            const buffer: ArrayBuffer = await window.electronAPI.readReportFileBuffer(filePath);

            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // adjust for your file type
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name || 'downloaded-file.xlsx';

            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to read file buffer or download:', error);
        }
    };

    const filteredFiles = files.filter((file) =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
        <div className="p-6 text-gray-700 h-full flex flex-col gap-6">
            <h2 className="text-xl font-semibold">{t('reports.yourSavedReportsTitle')}</h2>

            {/* Upload Area */}
            <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-sm text-gray-500 hover:border-blue-400 transition-colors"
            >
                <UploadCloud className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <p>Drag & drop files here, or</p>
                <label className="text-blue-600 cursor-pointer underline ml-1">
                    <input type="file" multiple className="hidden" onChange={handleFileInput} />
                    browse
                </label>
            </div>

            {/* Search Input */}
            <div>
                <input
                    type="text"
                    placeholder="Пошук за назвою..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border rounded shadow-sm"
                />
            </div>

            {/* File List */}
            <div className="space-y-2 text-sm text-gray-700">
                {filteredFiles.length === 0 ? (
                    <p className="text-gray-400">{t('reports.yourSavedReportsEmpty')}</p>
                ) : (
                    <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">
                            📑 Список збережених звітів
                        </h3>

                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {filteredFiles.length === 0 ? (
                                <p className="text-gray-500 italic text-sm">
                                    Немає збережених звітів.
                                </p>
                            ) : (
                                filteredFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-300 transition"
                                    >
                                        <div>
                                            <div className="text-base font-medium text-gray-800 flex items-center gap-1">
                                                📁 {file.name}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {new Date(file.createdAt).toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() =>
                                                    handleDownload(file.filePath, file.name)
                                                }
                                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 transition"
                                            >
                                                <Download className="w-4 h-4" />
                                                {t('reports.download')}
                                            </button>
                                            <button
                                                onClick={() => removeFileById(file.id)}
                                                className="text-red-500 hover:text-red-700 transition"
                                                title="Видалити файл"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
