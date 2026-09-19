import { renderAsync } from 'docx-preview';
import { Download, FileText } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

import { useI18nStore } from '../../stores/i18nStore';
import { downloadFile } from '../lib/download';
import { Alert, Button, EmptyState, Modal } from '../ui';

export type FileWithDataUrl = {
    name: string;
    type: string;
    dataUrl: string;
};

type Props = {
    file: FileWithDataUrl;
    onClose: () => void;
};

/** Rows of a sheet drawn in the preview: a big workbook opens at once, the file keeps all. */
const PREVIEW_ROWS = 200;

type PreviewSheet = {
    name: string;
    headers: string[];
    rows: Record<string, unknown>[];
    total: number;
};

function readWorkbook(dataUrl: string): PreviewSheet[] | null {
    try {
        const workbook = XLSX.read(dataUrl.split(',')[1] ?? '', { type: 'base64' });
        return workbook.SheetNames.map((name) => {
            const data = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' }) as Record<
                string,
                unknown
            >[];
            return {
                name,
                headers: data.length ? Object.keys(data[0]) : [],
                rows: data.slice(0, PREVIEW_ROWS),
                total: data.length,
            };
        }).filter((sheet) => sheet.total > 0);
    } catch {
        return null;
    }
}

function ExcelPreview({ dataUrl }: { dataUrl: string }) {
    const { t } = useI18nStore();
    // Read once per file, not on every render of the dialog.
    const sheets = useMemo(() => readWorkbook(dataUrl), [dataUrl]);
    if (!sheets) return <Alert tone="error">{t('filePreview.excelError')}</Alert>;

    return (
        <div className="w-full space-y-6">
            {sheets.map((sheet) => (
                <div key={sheet.name}>
                    <h3 className="mb-2 text-sm font-semibold text-ink">{sheet.name}</h3>
                    <div className="overflow-auto rounded-lg border border-line">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {sheet.headers.map((header) => (
                                        <th key={header}>{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sheet.rows.map((row, idx) => (
                                    <tr key={idx}>
                                        {sheet.headers.map((header) => (
                                            <td key={header}>{String(row[header] ?? '')}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {sheet.total > sheet.rows.length && (
                        <p className="mt-1 text-xs text-ink-3">
                            {t('excelPreview.more', {
                                shown: sheet.rows.length,
                                total: sheet.total,
                            })}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}

/**
 * PDF inside the app: the content is handed to the built-in viewer as an in-memory blob, so
 * the document never has to be saved somewhere to be read.
 */
function PdfPreview({ dataUrl, title }: { dataUrl: string; title: string }) {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        const binary = atob(dataUrl.split(',')[1] ?? '');
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [dataUrl]);

    if (!url) return null;
    return (
        <iframe
            src={url}
            title={title}
            className="h-[72vh] w-full rounded-lg border-0 bg-surface"
        />
    );
}

function DocxPreview({ dataUrl }: { dataUrl: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const binary = atob(dataUrl.split(',')[1]);
        const byteArray = Uint8Array.from(binary, (c) => c.charCodeAt(0));

        if (containerRef.current) {
            containerRef.current.innerHTML = 'Завантаження...';
            renderAsync(byteArray.buffer, containerRef.current).catch((err) => {
                console.error('DOCX render failed:', err);
                containerRef.current!.innerHTML = 'Не вдалося відобразити документ.';
            });
        }
    }, [dataUrl]);

    return <div ref={containerRef} className="paper w-full overflow-auto text-sm" />;
}

export default function FilePreviewModal({ file, onClose }: Props) {
    const isImage = file.type?.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const isDocx =
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isXlsx =
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return (
        <Modal
            open
            onClose={onClose}
            title={<span className="block truncate">{file.name}</span>}
            icon={<FileText />}
            width="max-w-5xl"
            bodyClassName={isImage || isPdf ? 'p-3 bg-surface-2' : 'px-5 py-5 bg-surface-2'}
            footer={
                <Button
                    variant="secondary"
                    icon={<Download className="size-4" />}
                    onClick={async () => {
                        await downloadFile(file.dataUrl, file.name);
                    }}
                >
                    Зберегти копію…
                </Button>
            }
        >
            {isImage ? (
                <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="mx-auto max-h-[72vh] rounded-lg object-contain"
                />
            ) : isPdf ? (
                <PdfPreview dataUrl={file.dataUrl} title={file.name} />
            ) : isDocx ? (
                <DocxPreview dataUrl={file.dataUrl} />
            ) : isXlsx ? (
                <ExcelPreview dataUrl={file.dataUrl} />
            ) : (
                <EmptyState
                    icon={<FileText />}
                    title="Перегляд цього типу файлу недоступний"
                    description="Збережіть копію файлу й відкрийте її у відповідній програмі."
                />
            )}
        </Modal>
    );
}
