import { FileText, Paperclip, X } from 'lucide-react';
import { useState } from 'react';

import type { AwardFile } from '../../../../../shared/types/user';
import { awardsApi } from '../../../../shared/api/awards';
import { reportError } from '../../../../shared/api/errors';
import FilePreviewModal, {
    type FileWithDataUrl,
} from '../../../../shared/components/FilePreviewModal';
import { pickFiles, readAsDataUrl, uniqueFileName } from '../../../../shared/lib/pickFiles';
import { Button, formatBytes, IconButton } from '../../../../shared/ui';
import { toast } from '../../../../shared/ui/toast';
import { useI18nStore } from '../../../../stores/i18nStore';

/** 25 MB per document: a scan of a decree or a certificate, not an archive. */
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Documents of one award (decree, order, certificate): open any of them, and in the editor
 * add or remove. New files carry their content until the card is saved.
 */
export default function AwardFiles({
    userId,
    recordId,
    files,
    onChange,
}: {
    /** The person; missing for a card that was never saved (only new files exist then). */
    userId?: number;
    recordId: string;
    files: AwardFile[];
    /** Without it the list is read-only. */
    onChange?: (files: AwardFile[]) => void;
}) {
    const { t } = useI18nStore();
    const [preview, setPreview] = useState<FileWithDataUrl | null>(null);

    const open = async (file: AwardFile) => {
        try {
            const dataUrl =
                file.dataUrl ??
                (userId ? await awardsApi.loadFile(userId, recordId, file.name) : null);
            if (!dataUrl) return;
            setPreview({ name: file.name, type: file.type ?? '', dataUrl });
        } catch (err) {
            reportError(err, { context: 'award-file' });
        }
    };

    const add = async () => {
        if (!onChange) return;
        try {
            const picked = await pickFiles('documents', { multiple: true });
            if (!picked.length) return;
            const next = [...files];
            for (const file of picked) {
                if (file.size > MAX_BYTES) {
                    toast.warning(t('awards.files.tooLarge', { name: file.name }));
                    continue;
                }
                next.push({
                    name: uniqueFileName(
                        file.name,
                        next.map((f) => f.name),
                    ),
                    type: file.type,
                    size: file.size,
                    dataUrl: await readAsDataUrl(file),
                });
            }
            onChange(next);
        } catch (err) {
            reportError(err, { context: 'award-files' });
        }
    };

    if (!files.length && !onChange) return null;

    return (
        <div className="space-y-2">
            {files.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                    {files.map((file) => (
                        <li
                            key={file.name}
                            className="flex max-w-full items-center gap-1 rounded-lg border border-line bg-surface-2 py-1 pl-2 pr-1"
                        >
                            <button
                                type="button"
                                onClick={() => void open(file)}
                                title={t('awards.files.open')}
                                className="flex min-w-0 items-center gap-2 text-left text-[13px] text-ink hover:text-primary-ink"
                            >
                                <FileText className="size-4 shrink-0 text-ink-3" />
                                <span className="truncate">{file.name}</span>
                                {file.size ? (
                                    <span className="shrink-0 text-[11px] text-ink-3">
                                        {formatBytes(file.size)}
                                    </span>
                                ) : null}
                                {file.dataUrl && (
                                    <span className="shrink-0 text-[11px] text-warning-ink">
                                        {t('awards.files.unsaved')}
                                    </span>
                                )}
                            </button>
                            {onChange && (
                                <IconButton
                                    label={t('awards.files.remove')}
                                    size="sm"
                                    variant="ghost"
                                    className="size-6 hover:bg-danger-soft hover:text-danger-ink"
                                    onClick={() =>
                                        onChange(files.filter((f) => f.name !== file.name))
                                    }
                                    icon={<X className="size-3.5" />}
                                />
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {onChange && (
                <Button
                    size="sm"
                    variant="secondary"
                    icon={<Paperclip className="size-4" />}
                    onClick={add}
                >
                    {t('awards.files.add')}
                </Button>
            )}
            {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
        </div>
    );
}
