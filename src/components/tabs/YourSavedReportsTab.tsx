import { useEffect } from 'react';
import { Download, UploadCloud, Trash2, CheckCircle } from 'lucide-react';
import { useI18nStore } from '../../stores/i18nStore';
import { useReportFilesStore } from '../../stores/reportFilesStore';

export default function YourSavedReportsTab() {
    const { t } = useI18nStore();
    const { files, loadFromDb, addFileFromDisk, removeFileById } = useReportFilesStore();

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

    const handleDownload = (buffer: ArrayBuffer | undefined, name: string) => {
        if (!buffer) return;

        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();

        URL.revokeObjectURL(url);
    };

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

            {/* File List */}
            <div className="space-y-2 text-sm text-gray-700">
                {files.length === 0 ? (
                    <p className="text-gray-400">{t('reports.yourSavedReportsEmpty')}</p>
                ) : (
                    <div>
                        <h3 className="font-bold pb-[15px] text-2xl">Список збереженних звітів</h3>
                        <ul className="space-y-2">
                            {files.map((file) => (
                                <li
                                    key={file.id}
                                    className="border p-3 rounded shadow-sm bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
                                >
                                    <div>
                                        <div className="font-medium">📁 {file.name}</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(file.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-center">
                                        <button
                                            onClick={() => handleDownload(file.buffer, file.name)}
                                            className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
                                        >
                                            <Download className="w-4 h-4" />
                                            {t('reports.download')}
                                        </button>
                                        <button
                                            onClick={() => removeFileById(file.id)}
                                            className="text-red-500 hover:text-red-700"
                                            title="Remove file"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
