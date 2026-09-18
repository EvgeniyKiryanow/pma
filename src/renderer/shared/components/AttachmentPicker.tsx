import { Eye, FileText, UploadCloud, X } from 'lucide-react';
import { useState } from 'react';

import type { FileKind } from '../../../shared/types/files';
import { reportError } from '../api/errors';
import { pickFile, readAsDataUrl } from '../lib/pickFiles';
import { cn, IconButton } from '../ui';
import FilePreviewModal, { type FileWithDataUrl } from './FilePreviewModal';

/** Single supporting document (order, report...) read as a data URL, with preview. */
export default function AttachmentPicker({
    file,
    onChange,
    kind = 'documents',
    placeholder = 'Оберіть файл-підставу',
}: {
    file: FileWithDataUrl | null;
    onChange: (file: FileWithDataUrl | null) => void;
    kind?: FileKind;
    placeholder?: string;
}) {
    const [showPreview, setShowPreview] = useState(false);

    const choose = async () => {
        try {
            const picked = await pickFile(kind);
            if (!picked) return;
            onChange({ name: picked.name, type: picked.type, dataUrl: await readAsDataUrl(picked) });
        } catch (err) {
            reportError(err, { context: 'attachment-picker' });
        }
    };

    return (
        <>
            {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2.5 pl-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-ink">
                        <FileText className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink" title={file.name}>
                        {file.name}
                    </span>
                    <IconButton
                        label="Переглянути"
                        size="sm"
                        onClick={() => setShowPreview(true)}
                        icon={<Eye className="size-4" />}
                    />
                    <IconButton
                        label="Прибрати файл"
                        size="sm"
                        className="hover:bg-danger-soft hover:text-danger-ink"
                        onClick={() => onChange(null)}
                        icon={<X className="size-4" />}
                    />
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => void choose()}
                    className={cn(
                        'flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong px-4 py-5 text-sm transition-colors',
                        'text-ink-2 hover:border-primary hover:bg-primary-soft hover:text-primary-ink',
                    )}
                >
                    <UploadCloud className="size-5" />
                    <span className="font-medium">{placeholder}</span>
                    <span className="text-xs text-ink-3">PDF, Word, Excel або зображення</span>
                </button>
            )}
            {showPreview && file && (
                <FilePreviewModal file={file} onClose={() => setShowPreview(false)} />
            )}
        </>
    );
}
