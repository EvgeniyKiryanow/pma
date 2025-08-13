// components/FilePreviewModal.tsx
import { renderAsync } from 'docx-preview';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

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
            <div className="overflow-auto max-h-[80vh] w-full text-sm space-y-8">
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
                            <h3 className="text-base font-bold mb-2">{sheetName}</h3>
                            <table className="min-w-full border border-gray-300">
                                <thead className="bg-gray-100 text-left">
                                    <tr>
                                        {headers.map((header) => (
                                            <th
                                                key={header}
                                                className="p-2 border-b border-gray-300 font-semibold"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row, idx) => (
                                        <tr key={idx}>
                                            {headers.map((header) => (
                                                <td
                                                    key={header}
                                                    className="p-2 border-b border-gray-200"
                                                >
                                                    {row[header]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>
        );
    } catch {
        return <p className="text-red-500">❌ Помилка при читанні Excel</p>;
    }
}

function DocxPreview({ dataUrl }: { dataUrl: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const binary = atob(dataUrl.split(',')[1]);
        const byteArray = Uint8Array.from(binary, (c) => c.charCodeAt(0));

        if (containerRef.current) {
            containerRef.current.innerHTML = 'Завантаження...';
            renderAsync(byteArray.buffer, containerRef.current).catch((err) => {
                console.error('❌ DOCX render failed:', err);
                containerRef.current!.innerHTML = '⚠️ Не вдалося відобразити документ.';
            });
        }
    }, [dataUrl]);

    return (
        <div
            ref={containerRef}
            className="overflow-auto max-h-[80vh] text-sm text-gray-800 w-full px-4"
        />
    );
}

export default function FilePreviewModal({ file, onClose }: Props) {
    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-500 z-10"
                    title="Закрити"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Preview Content */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-4 w-full">
                    {file.type.startsWith('image/') ? (
                        <img
                            src={file.dataUrl}
                            alt={file.name}
                            className="max-h-[80vh] object-contain"
                        />
                    ) : file.type === 'application/pdf' ? (
                        <iframe
                            src={file.dataUrl}
                            title={file.name}
                            className="w-full h-[80vh] border-0"
                        />
                    ) : file.type ===
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? (
                        <DocxPreview dataUrl={file.dataUrl} />
                    ) : file.type ===
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ? (
                        <ExcelPreview dataUrl={file.dataUrl} />
                    ) : (
                        <div className="text-center text-sm text-gray-700">
                            <p className="mb-4">Неможливо переглянути цей файл тут.</p>
                            <a
                                href={file.dataUrl}
                                download={file.name}
                                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                                ⬇️ Завантажити {file.name}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
