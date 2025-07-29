import { CommentOrHistoryEntry } from '../../types/user';
import { Trash2, CalendarDays, FileText, ArrowRight, Info, RefreshCcw } from 'lucide-react';
import { useI18nStore } from '../../stores/i18nStore';
import { useState } from 'react';
import FilePreviewModal, { FileWithDataUrl } from '../../components/FilePreviewModal';

type Props = {
    entry: CommentOrHistoryEntry;
    onDelete: (id: number) => void;
    onEdit: (entry: CommentOrHistoryEntry) => void; // ✅ new
};

export default function HistoryItem({ entry, onDelete, onEdit }: Props) {
    const { t } = useI18nStore();
    const [showFullDesc, setShowFullDesc] = useState(false);
    const [previewFile, setPreviewFile] = useState<FileWithDataUrl | null>(null);

    const isStatusChange = entry.type === 'statusChange';
    const dateFormatted = new Date(entry.date).toLocaleString();

    const description = entry.description || '';

    let prevStatus: string | null = null;
    let newStatus: string | null = null;
    if (isStatusChange) {
        const match = description.match(/"(.+?)"\s*→\s*"(.+?)"/);
        console.log(match, 'match');
        if (match) {
            prevStatus = match[1];
            newStatus = match[2];
        }
    }

    const isPosadaChange =
        description.includes('Призначено на посаду') ||
        description.includes('Переміщено з посади') ||
        description.includes('звільнено з посади');

    let oldPosada: string | null = null;
    let newPosada: string | null = null;

    if (description.includes('Переміщено з посади')) {
        const match = description.match(/Переміщено з посади (.+?) → (.+)/);
        if (match) {
            oldPosada = match[1].trim();
            newPosada = match[2].trim();
        }
    } else if (description.includes('звільнено з посади')) {
        oldPosada = description.replace(/.*звільнено з посади\s*/, '').trim();
        newPosada = '— (прибрано)';
    } else if (description.includes('Призначено на посаду')) {
        newPosada = description.replace('Призначено на посаду', '').trim();
    }

    return (
        <li
            className={`group relative rounded-xl border p-5 shadow-sm hover:shadow-md transition-all ${
                isPosadaChange ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
            }`}
        >
            {/* Action buttons on hover */}
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                    onClick={() => onEdit(entry)}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                    title="Редагувати"
                >
                    ✏️
                </button>
                <button
                    onClick={() => onDelete(entry.id)}
                    className="text-red-500 hover:text-red-700"
                    title={t('historyItem.delete')}
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <CalendarDays className="w-4 h-4 text-blue-500" />
                <span className="uppercase font-medium text-blue-600">
                    {isStatusChange
                        ? t('historyItem.type.statusChange')
                        : isPosadaChange
                          ? 'Зміна посади'
                          : t(`historyItem.type.${entry.type}`)}
                </span>
                <span className="text-gray-400">•</span>
                <span>{dateFormatted}</span>

                {isPosadaChange && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                        <RefreshCcw className="w-3 h-3" /> Переміщення
                    </span>
                )}
            </div>

            {/* ✅ Status Change */}
            {isStatusChange && (
                <div className="p-4 rounded-xl border border-blue-300 bg-gradient-to-br from-blue-50 to-white shadow-sm mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-blue-100 text-blue-700 p-2 rounded-full">
                            <Info className="w-4 h-4" />
                        </div>
                        <h3 className="text-blue-800 font-semibold text-base">
                            {t('historyItem.type.statusChange')}
                        </h3>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 leading-snug">
                        {t('historyItem.statusChangeDescription') ||
                            'Статус особового складу був оновлений. Нижче показані старий та новий статус.'}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300 shadow-sm">
                            {prevStatus}
                        </span>
                        <ArrowRight className="hidden sm:inline-block w-6 h-6 text-blue-500" />
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-300 shadow-sm mt-2 sm:mt-0">
                            {newStatus}
                        </span>
                    </div>
                </div>
            )}

            {/* ✅ Posada Change */}
            {isPosadaChange && (
                <div className="p-4 rounded-xl border border-blue-300 bg-gradient-to-br from-blue-50 to-white shadow-sm mb-3">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-blue-100 text-blue-700 p-2 rounded-full">
                            <RefreshCcw className="w-4 h-4" />
                        </div>
                        <h3 className="text-blue-800 font-semibold text-base">🔄 Зміна посади</h3>
                    </div>

                    {oldPosada && newPosada ? (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                            <div className="flex-1 px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-800 text-sm shadow-sm">
                                <span className="font-medium text-gray-600 block text-xs">
                                    Було:
                                </span>
                                <span className="font-semibold">{oldPosada}</span>
                            </div>
                            <div className="flex justify-center my-2 sm:my-0">
                                <ArrowRight className="w-6 h-6 text-blue-500" />
                            </div>
                            <div
                                className={`flex-1 px-4 py-2 rounded-lg ${
                                    newPosada === '— (прибрано)'
                                        ? 'bg-red-50 border border-red-300 text-red-700'
                                        : 'bg-green-50 border border-green-300 text-green-800'
                                } text-sm shadow-sm`}
                            >
                                <span
                                    className={`font-medium block text-xs ${
                                        newPosada === '— (прибрано)'
                                            ? 'text-red-600'
                                            : 'text-green-600'
                                    }`}
                                >
                                    Стало:
                                </span>
                                <span className="font-semibold">{newPosada}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="px-4 py-2 rounded-lg bg-green-50 border border-green-300 text-green-800 shadow-sm">
                            ✅ <span className="font-semibold">{newPosada || description}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ✅ Regular text */}
            {!isStatusChange && !isPosadaChange && description && (
                <div className="mb-3">
                    <p
                        className={`text-gray-800 font-medium text-base leading-relaxed whitespace-pre-line transition-all ${
                            showFullDesc ? '' : 'max-h-32 overflow-hidden'
                        }`}
                    >
                        {description}
                    </p>

                    {description.length > 200 && ( // show toggle if long
                        <button
                            onClick={() => setShowFullDesc(!showFullDesc)}
                            className="mt-2 text-sm text-blue-600 hover:underline"
                        >
                            {showFullDesc ? '⬆️ Згорнути' : '⬇️ Показати повністю'}
                        </button>
                    )}
                </div>
            )}

            {/* ✅ Files */}
            {entry.files?.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
                    {entry.files.map((file, i) => (
                        <div
                            key={i}
                            className="relative border rounded-lg overflow-hidden bg-gray-50 shadow-sm hover:shadow-md transition flex flex-col"
                        >
                            {/* === Preview Button === */}
                            {file.dataUrl ? (
                                <button
                                    onClick={() =>
                                        setPreviewFile({
                                            name: file.name,
                                            type: file.type,
                                            dataUrl: file.dataUrl,
                                        })
                                    }
                                    className="flex-1 w-full text-left"
                                >
                                    {file.type.startsWith('image/') ? (
                                        <img
                                            src={file.dataUrl}
                                            alt={file.name}
                                            className="w-full h-32 object-cover hover:scale-105 transition-transform"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-2 p-4 text-blue-600 text-sm hover:underline">
                                            <FileText className="w-6 h-6" /> {file.name}
                                        </div>
                                    )}
                                </button>
                            ) : (
                                <span className="p-3 text-xs">{file.name}</span>
                            )}

                            {/* === Download Button === */}
                            {file.dataUrl && (
                                <a
                                    href={file.dataUrl}
                                    download={file.name}
                                    className="text-center text-sm text-blue-500 hover:underline p-2 border-t border-gray-200"
                                >
                                    ⬇️ Завантажити
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}
        </li>
    );
}
