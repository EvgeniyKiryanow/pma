import { ArrowRight, FilePlus2, FileText, Paperclip, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import FilePreviewModal from '../../../shared/components/FilePreviewModal';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Alert, Button, FieldShell, Modal } from '../../../shared/ui';
import { StatusExcel } from '../../../shared/utils/excelUserStatuses';
import { useI18nStore } from '../../../stores/i18nStore';

type FileWithDataUrl = {
    name: string;
    type: string;
    dataUrl: string;
};

type AddHistoryModalProps = {
    isOpen: boolean;
    isEditing?: boolean;
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
    ) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    currentStatus?: string;
    initialPeriod?: { from: string; to: string };
};

export default function AddHistoryModal({
    isOpen,
    isEditing = false,
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

    const missingForStatus =
        newStatus !== '' && (files.length === 0 || !period.from)
            ? [files.length === 0 && 'файл-підставу', !period.from && 'період'].filter(Boolean)
            : [];

    return (
        <Modal
            open
            onClose={onClose}
            title={isEditing ? 'Редагувати запис історії' : t('historyModal.title')}
            description="Зміна статусу, період, опис і документи-підстави"
            icon={<FilePlus2 />}
            width="max-w-2xl"
            closeOnBackdrop={false}
            footer={
                <>
                    {newStatus && (
                        <span className="mr-auto hidden min-w-0 items-center gap-1.5 text-xs text-ink-3 md:flex">
                            <span className="truncate">{currentStatus || '—'}</span>
                            <ArrowRight className="size-3.5 shrink-0" />
                            <span className="truncate font-medium text-ink">{newStatus}</span>
                        </span>
                    )}
                    <Button variant="secondary" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleSave}>{t('historyModal.save')}</Button>
                </>
            }
        >
            <div className="space-y-5">
                <FieldShell
                    label="Зміна статусу"
                    htmlFor="history-status"
                    hint="Залиште «без змін», якщо це звичайний запис історії."
                >
                    <div className="mb-2 flex items-center gap-2 text-xs text-ink-3">
                        Поточний:
                        <StatusBadge status={currentStatus} />
                    </div>
                    <select
                        id="history-status"
                        className="field"
                        value={newStatus || ''}
                        onChange={(e) => setNewStatus(e.target.value)}
                    >
                        <option value="">— без змін —</option>
                        {Object.values(StatusExcel).map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </FieldShell>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldShell label="Період з" htmlFor="period-from">
                        <input
                            id="period-from"
                            type="date"
                            className="field"
                            value={period.from}
                            onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
                        />
                    </FieldShell>
                    <FieldShell label="Період по" htmlFor="period-to">
                        <input
                            id="period-to"
                            type="date"
                            className="field"
                            value={period.to}
                            onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
                        />
                    </FieldShell>
                </div>

                <FieldShell label={t('historyModal.description')} htmlFor="history-description">
                    <textarea
                        id="history-description"
                        rows={4}
                        className="field"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('historyModal.descriptionPlaceholder')}
                    />
                </FieldShell>

                <div>
                    <p className="label">Документи</p>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong px-4 py-4 text-sm font-medium text-ink-2 transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-ink"
                    >
                        <Paperclip className="size-4" />
                        {t('historyModal.attach')}
                        <span className="font-normal text-ink-3">
                            · PDF, Word, Excel, зображення
                        </span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={onFileChange}
                        accept=".doc,.docx,.xls,.xlsx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,image/*"
                        className="hidden"
                    />

                    {files.length > 0 && (
                        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                            {files.map((file, i) => (
                                <li
                                    key={i}
                                    className="group relative overflow-hidden rounded-lg border border-line bg-surface-2"
                                >
                                    <button
                                        onClick={() => setPreviewFile(file)}
                                        className="block w-full"
                                        title="Переглянути файл"
                                    >
                                        {file.type?.startsWith('image/') && file.dataUrl ? (
                                            <img
                                                src={file.dataUrl}
                                                alt={file.name}
                                                className="h-24 w-full object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-24 flex-col items-center justify-center gap-1.5 px-2 text-center">
                                                <FileText className="size-6 text-ink-3" />
                                                <span className="line-clamp-2 break-all text-xs text-ink-2">
                                                    {file.name}
                                                </span>
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => removeFile(i)}
                                        className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-surface/90 text-danger-ink shadow-card transition-colors hover:bg-danger-soft"
                                        title={t('historyModal.remove')}
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {missingForStatus.length > 0 && (
                    <Alert tone="warning">
                        Для зміни статусу бажано додати {missingForStatus.join(' та ')} — інакше
                        запис буде позначено як «без файлу або періоду».
                    </Alert>
                )}
            </div>

            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}
        </Modal>
    );
}
