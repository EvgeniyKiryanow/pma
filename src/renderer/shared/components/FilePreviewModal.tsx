import { renderAsync } from 'docx-preview';
import { Download, FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

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

function ExcelPreview({ dataUrl }: { dataUrl: string }) {
    try {
        const binary = atob(dataUrl.split(',')[1]);
        const workbook = XLSX.read(binary, { type: 'binary' });

        return (
            <div className="w-full space-y-6">
                {workbook.SheetNames.map((sheetName) => {
                    const sheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<
                        string,
                        any
                    >[];

                    if (!data.length) return null;

                    const headers = Object.keys(data[0]);

                    return (
                        <div key={sheetName}>
                            <h3 className="mb-2 text-sm font-semibold text-ink">{sheetName}</h3>
                            <div className="overflow-auto rounded-lg border border-line">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            {headers.map((header) => (
                                                <th key={header}>{header}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((row, idx) => (
                                            <tr key={idx}>
                                                {headers.map((header) => (
                                                    <td key={header}>{row[header]}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    } catch {
        return <Alert tone="error">Помилка при читанні Excel-файлу</Alert>;
    }
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
