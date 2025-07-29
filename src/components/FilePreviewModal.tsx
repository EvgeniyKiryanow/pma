// components/FilePreviewModal.tsx
import { X } from 'lucide-react';
import * as XLSX from 'xlsx';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import React from 'react';

export type FileWithDataUrl = {
    name: string;
    type: string;
    dataUrl: string;
};

type Props = {
    file: FileWithDataUrl;
    onClose: () => void;
};

function getXlsxPreview(dataUrl: string): React.ReactNode {
    try {
        const binary = atob(dataUrl.split(',')[1]);
        const workbook = XLSX.read(binary, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const html = XLSX.utils.sheet_to_html(sheet);
        return (
            <div
                className="max-h-[80vh] overflow-auto text-sm text-gray-800"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    } catch {
        return <p className="text-red-500">Помилка при читанні Excel</p>;
    }
}

function getDocxPreview(dataUrl: string): React.ReactNode {
    try {
        const binary = atob(dataUrl.split(',')[1]);
        const zip = new PizZip(binary);
        const doc = new Docxtemplater(zip);
        const text = doc.getFullText();
        return (
            <div className="max-h-[80vh] overflow-auto whitespace-pre-wrap text-sm text-gray-800 p-4">
                {text}
            </div>
        );
    } catch {
        return <p className="text-red-500">Помилка при читанні DOCX</p>;
    }
}

export default function FilePreviewModal({ file, onClose }: Props) {
    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-500 z-10"
                    title="Закрити"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Content */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-4">
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
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ? (
                        getXlsxPreview(file.dataUrl)
                    ) : file.type ===
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? (
                        getDocxPreview(file.dataUrl)
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
