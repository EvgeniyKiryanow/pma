import { CommentOrHistoryEntry } from '../../types/user';
import { Trash2, CalendarDays, FileText, ArrowRight, Info } from 'lucide-react';
import { useI18nStore } from '../../stores/i18nStore';

type Props = {
    entry: CommentOrHistoryEntry;
    onDelete: (id: number) => void;
};

export default function HistoryItem({ entry, onDelete }: Props) {
    const { t } = useI18nStore();

    const isStatusChange = entry.type === 'statusChange';
    const dateFormatted = new Date(entry.date).toLocaleString();

    // ✅ Разделяем по строкам, если в описании несколько частей
    const descriptionLines = entry.description?.split('\n') || [];
    const firstLine = descriptionLines[0] || '';
    const restLines = descriptionLines.slice(1).join('\n');

    // ✅ Выделяем prevStatus и newStatus из первой строки
    let prevStatus: string | null = null;
    let newStatus: string | null = null;
    if (isStatusChange && firstLine) {
        const match = firstLine.match(/"(.+?)"\s*→\s*"(.+?)"/);
        if (match) {
            prevStatus = match[1];
            newStatus = match[2];
        }
    }

    return (
        <li className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
            {/* Delete button */}
            <button
                onClick={() => onDelete(entry.id)}
                className="absolute top-3 right-3 opacity-60 group-hover:opacity-100 text-red-500 hover:text-red-700 transition"
                title={t('historyItem.delete')}
            >
                <Trash2 className="w-5 h-5" />
            </button>

            {/* Header (type + date) */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <CalendarDays className="w-4 h-4 text-blue-500" />
                <span className="uppercase font-medium text-blue-600">
                    {isStatusChange
                        ? t('historyItem.type.statusChange')
                        : t(`historyItem.type.${entry.type}`)}
                </span>
                <span className="text-gray-400">•</span>
                <span>{dateFormatted}</span>
            </div>

            {/* ✅ Статусный блок */}
            {isStatusChange && prevStatus && newStatus && (
                <div className="p-4 rounded-xl border border-blue-300 bg-gradient-to-br from-blue-50 to-white shadow-sm mb-3">
                    {/* Title Row */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-blue-100 text-blue-700 p-2 rounded-full">
                            <Info className="w-4 h-4" />
                        </div>
                        <h3 className="text-blue-800 font-semibold text-base">
                            {t('historyItem.type.statusChange')}
                        </h3>
                    </div>

                    {/* Extra description */}
                    <p className="text-sm text-gray-600 mb-3 leading-snug">
                        {t('historyItem.statusChangeDescription') ||
                            'Статус особового складу був оновлений. Нижче показані старий та новий статус.'}
                    </p>

                    {/* Statuses */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                        {/* Old Status */}
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300 shadow-sm">
                            {prevStatus}
                        </span>

                        {/* Arrow */}
                        <ArrowRight className="hidden sm:inline-block w-6 h-6 text-blue-500" />

                        {/* New Status */}
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-300 shadow-sm mt-2 sm:mt-0">
                            {newStatus}
                        </span>
                    </div>
                </div>
            )}

            {/* ✅ Если есть дополнительный текст после статуса – выводим */}
            {isStatusChange && restLines && (
                <p className="text-gray-700 text-sm mb-3 leading-relaxed whitespace-pre-line">
                    {restLines}
                </p>
            )}

            {/* ✅ Обычное описание, если это не статус */}
            {!isStatusChange && entry.description && (
                <p className="text-gray-800 font-medium text-base mb-3 leading-relaxed whitespace-pre-line">
                    {entry.description}
                </p>
            )}

            {/* ✅ Files preview */}
            {entry.files?.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
                    {entry.files.map((file, i) => (
                        <div
                            key={i}
                            className="relative border rounded-lg overflow-hidden bg-gray-50 shadow-sm hover:shadow-md transition"
                        >
                            {file.dataUrl ? (
                                file.type === 'application/pdf' ? (
                                    <a
                                        href={file.dataUrl}
                                        download={file.name}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center justify-center gap-2 p-4 text-blue-600 text-sm hover:underline"
                                    >
                                        <FileText className="w-6 h-6" /> {file.name}
                                    </a>
                                ) : file.type.startsWith('image/') ? (
                                    <a
                                        href={file.dataUrl}
                                        download={file.name}
                                        title={t('historyItem.download', { name: file.name })}
                                    >
                                        <img
                                            src={file.dataUrl}
                                            alt={file.name}
                                            className="w-full h-32 object-cover hover:scale-105 transition-transform"
                                        />
                                    </a>
                                ) : (
                                    <a
                                        href={file.dataUrl}
                                        download={file.name}
                                        className="block p-4 text-center text-sm text-blue-600 hover:underline"
                                    >
                                        📎 {file.name}
                                    </a>
                                )
                            ) : (
                                <span className="p-3 text-xs">{file.name}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ✅ Extra content for text-only */}
            {entry.type === 'text' && entry.content && (
                <div className="mt-3 p-3 rounded-md bg-blue-50 text-blue-700 text-sm leading-snug">
                    {entry.content}
                </div>
            )}
        </li>
    );
}
