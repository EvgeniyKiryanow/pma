import { CommentOrHistoryEntry } from '../../types/user';
import {
    Trash2,
    CalendarDays,
    FileText,
    ArrowRight,
    Info,
    RefreshCcw,
    CalendarRange,
} from 'lucide-react';
import { useI18nStore } from '../../stores/i18nStore';
import { useState } from 'react';
import { FileWithDataUrl } from '../FilePreviewModal';

type Props = {
    userId: any;
    entry: CommentOrHistoryEntry;
    onDelete: (id: number) => void;
    onEdit: (entry: CommentOrHistoryEntry) => void;
    onPreviewFile: (file: FileWithDataUrl) => void; // ✅ NEW
};

export default function HistoryItem({ entry, onDelete, onEdit, userId, onPreviewFile }: Props) {
    const { t } = useI18nStore();
    const [showFullDesc, setShowFullDesc] = useState(false);
    // { name: string; type: string; dataUrl?: string }
    const handlePreviewFile = async (file: any) => {
        if (file.dataUrl) {
            onPreviewFile(file);
            return;
        }

        const { dataUrl } = await window.electronAPI.loadHistoryFile(userId, entry.id, file.name);
        onPreviewFile({
            ...file,
            dataUrl,
        });
    };

    const handleDownload = async (file: { name: string; dataUrl?: string }) => {
        if (!file.dataUrl) {
            const { dataUrl } = await window.electronAPI.loadHistoryFile(
                userId,
                entry.id,
                file.name,
            );
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = file.name;
            a.click();
        } else {
            const a = document.createElement('a');
            a.href = file.dataUrl;
            a.download = file.name;
            a.click();
        }
    };

    const isStatusChange = entry.type === 'statusChange';
    const dateFormatted = new Date(entry.date).toLocaleString();

    const description = entry.description || '';

    let prevStatus: string | null = null;
    let newStatus: string | null = null;
    if (isStatusChange) {
        const match = description.match(/"(.+?)"\s*→\s*"(.+?)"/);
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
    const isIncompleteStatusChange =
        isStatusChange && (!entry.period.from || !entry.files || entry.files.length === 0);
    console.log(entry, 'entry');
    return (
        <li
            className={`group relative rounded-xl border p-5 shadow-sm hover:shadow-md transition-all ${
                isIncompleteStatusChange
                    ? 'border-red-500 bg-gradient-to-br from-red-50 to-white shadow-md'
                    : isPosadaChange
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white'
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
            {isIncompleteStatusChange && (
                <div className="mb-4 inline-flex items-center gap-2 bg-red-100 border border-red-300 text-red-700 text-xs font-semibold px-3 py-1 rounded-full shadow-sm animate-pulse z-10">
                    <Info className="w-4 h-4" />
                    Відсутній файл або період
                </div>
            )}
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

                    <p className="text-sm text-gray-600 mb-2 leading-snug">
                        {t('historyItem.statusChangeDescription') ||
                            'Статус особового складу був оновлений. Нижче показані старий та новий статус.'}
                    </p>

                    {description && (
                        <p className="text-sm text-gray-800 mb-3 whitespace-pre-line">
                            {description}
                        </p>
                    )}

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
            {entry.type === 'order' && (
                <div className="p-4 rounded-xl border border-yellow-400 bg-gradient-to-br from-yellow-50 to-white shadow-sm mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-yellow-200 text-yellow-800 p-2 rounded-full">📤</div>
                        <h3 className="text-yellow-800 font-semibold text-base">
                            Подано розпорядження
                        </h3>
                    </div>

                    {description && (
                        <p className="text-sm text-gray-700 mb-3 whitespace-pre-line">
                            {description}
                        </p>
                    )}

                    {entry.period?.from && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CalendarDays className="w-4 h-4 text-yellow-500" />
                            <span>
                                Дата подання:{' '}
                                <span className="font-medium text-gray-800">
                                    {new Date(entry.period.from).toLocaleDateString()}
                                </span>
                            </span>
                        </div>
                    )}
                </div>
            )}
            {entry.type === 'exclude' && (
                <div className="p-4 rounded-xl border border-red-400 bg-gradient-to-br from-red-50 to-white shadow-sm mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-red-200 text-red-800 p-2 rounded-full">❌</div>
                        <h3 className="text-red-800 font-semibold text-base">
                            Користувача виключено
                        </h3>
                    </div>

                    {description && (
                        <p className="text-sm text-gray-700 mb-3 whitespace-pre-line">
                            {description}
                        </p>
                    )}

                    {entry.period?.from && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CalendarDays className="w-4 h-4 text-red-500" />
                            <span>
                                Дата виключення:{' '}
                                <span className="font-medium text-gray-800">
                                    {new Date(entry.period.from).toLocaleDateString()}
                                </span>
                            </span>
                        </div>
                    )}
                </div>
            )}
            {entry.type === 'restore' && (
                <div className="p-4 rounded-xl border border-green-400 bg-gradient-to-br from-green-50 to-white shadow-sm mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-green-200 text-green-800 p-2 rounded-full">♻️</div>
                        <h3 className="text-green-800 font-semibold text-base">
                            Користувача відновлено
                        </h3>
                    </div>

                    {entry.content && (
                        <p className="text-sm text-gray-700 mb-3 whitespace-pre-line">
                            {entry.content}
                        </p>
                    )}

                    {entry.period?.from && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CalendarDays className="w-4 h-4 text-green-500" />
                            <span>
                                Дата відновлення:{' '}
                                <span className="font-medium text-gray-800">
                                    {new Date(entry.period.from).toLocaleDateString()}
                                </span>
                            </span>
                        </div>
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
                            <div
                                key={i}
                                className="relative border rounded-lg overflow-hidden bg-gray-50 shadow-sm hover:shadow-md transition flex flex-col"
                            >
                                {/* === Preview Button === */}
                                <button
                                    onClick={() => handlePreviewFile(file)}
                                    className="flex-1 w-full text-left"
                                >
                                    {file.dataUrl && file.type.startsWith('image/') ? (
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

                                {/* === Download Button (always visible) === */}
                                <button
                                    onClick={() => handleDownload(file)}
                                    className="text-center text-sm text-blue-500 hover:underline p-2 border-t border-gray-200"
                                >
                                    ⬇️ Завантажити
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* ✅ Period display (if exists) */}
            {entry.period && (
                <div className="mt-6 bg-blue-100/60 border border-blue-200 rounded-xl px-6 py-4 flex items-center gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <CalendarRange className="w-6 h-6 text-blue-600 shrink-0" />
                        <span className="text-md font-bold text-blue-800">Період:</span>
                    </div>
                    <div className="text-md font-semibold text-gray-800 bg-white px-4 py-2 rounded-lg border border-gray-300 shadow-inner">
                        {entry.period.from && (
                            <span>{new Date(entry.period.from).toLocaleDateString()}</span>
                        )}

                        {entry.period.to && entry.period.from && ' — '}

                        {entry.period.to && (
                            <span>{new Date(entry.period.to).toLocaleDateString()}</span>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
}
