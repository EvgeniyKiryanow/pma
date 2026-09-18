import { Download, FileSpreadsheet, FolderOpen, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn, EmptyState, formatDateTime, IconButton, SearchInput } from '../../../shared/ui';
import { confirmAction } from '../../../shared/ui/confirm';
import { useI18nStore } from '../../../stores/i18nStore';
import { useReportFilesStore } from '../../report/model/reportFilesStore';

export default function YourSavedReportsTab() {
    const { t } = useI18nStore();
    const { files, loadFromDb, addFileFromDisk, removeFileById } = useReportFilesStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => {
        void loadFromDb();
    }, []);

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        droppedFiles.forEach((file) => void addFileFromDisk(file));
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
        selectedFiles.forEach((file) => void addFileFromDisk(file));
        e.target.value = '';
    };

    const handleDownload = async (filePath: string, name: string) => {
        try {
            const buffer: ArrayBuffer = await window.electronAPI.readReportFileBuffer(filePath);

            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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

    const handleDelete = async (id: number, name: string) => {
        const confirmed = await confirmAction({
            title: 'Видалити файл?',
            message: `«${name}» буде видалено зі збережених звітів.`,
            confirmLabel: t('common.delete'),
            tone: 'danger',
        });
        if (confirmed) await removeFileById(id);
    };

    const filteredFiles = files.filter((file) =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mx-auto max-w-4xl space-y-5">
                <label
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    className={cn(
                        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-colors',
                        dragOver
                            ? 'border-primary bg-primary-soft'
                            : 'border-line-strong bg-surface hover:border-primary hover:bg-primary-soft',
                    )}
                >
                    <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
                        <UploadCloud className="size-6" />
                    </span>
                    <span className="text-sm font-semibold text-ink">
                        Перетягніть файли сюди або натисніть, щоб обрати
                    </span>
                    <span className="text-xs text-ink-3">
                        Звіти зберігаються на цьому компʼютері
                    </span>
                    <input type="file" multiple className="hidden" onChange={handleFileInput} />
                </label>

                <section className="card overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                        <div>
                            <h2 className="text-[15px] font-semibold text-ink">
                                {t('reports.yourSavedReportsTitle')}
                            </h2>
                            <p className="text-xs text-ink-3">{files.length} файлів</p>
                        </div>
                        <SearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="Пошук за назвою…"
                            size="sm"
                            className="w-full max-w-xs"
                        />
                    </div>

                    {filteredFiles.length === 0 ? (
                        <EmptyState
                            icon={<FolderOpen />}
                            title={
                                files.length === 0
                                    ? t('reports.yourSavedReportsEmpty')
                                    : 'Нічого не знайдено'
                            }
                        />
                    ) : (
                        <ul className="divide-y divide-line">
                            {filteredFiles.map((file) => (
                                <li
                                    key={file.id}
                                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2"
                                >
                                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success-soft text-success-ink">
                                        <FileSpreadsheet className="size-4" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-ink">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-ink-3">
                                            {formatDateTime(file.createdAt)}
                                        </p>
                                    </div>
                                    <IconButton
                                        label={t('reports.download')}
                                        size="sm"
                                        onClick={() =>
                                            void handleDownload(file.filePath, file.name)
                                        }
                                        icon={<Download className="size-4" />}
                                    />
                                    <IconButton
                                        label="Видалити файл"
                                        size="sm"
                                        className="hover:bg-danger-soft hover:text-danger-ink"
                                        onClick={() => void handleDelete(file.id, file.name)}
                                        icon={<Trash2 className="size-4" />}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
