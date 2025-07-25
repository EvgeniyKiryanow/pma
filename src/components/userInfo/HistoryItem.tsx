import { CommentOrHistoryEntry } from '../../types/user';
import { Trash2, CalendarDays, FileText } from 'lucide-react';
import { useI18nStore } from '../../stores/i18nStore';

type Props = {
    entry: CommentOrHistoryEntry;
    onDelete: (id: number) => void;
};

export default function HistoryItem({ entry, onDelete }: Props) {
    const { t } = useI18nStore();

    return (
        <li className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
            {/* Delete button appears on hover */}
            <button
                onClick={() => onDelete(entry.id)}
                className="absolute top-3 right-3 opacity-60 group-hover:opacity-100 text-red-500 hover:text-red-700 transition"
                title={t('historyItem.delete')}
            >
                <Trash2 className="w-5 h-5" />
            </button>

            {/* Header (type + date) */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <CalendarDays className="w-4 h-4 text-blue-500" />
                <span className="uppercase font-medium text-blue-600">
                    {t(`historyItem.type.${entry.type}`)}
                </span>
                <span className="text-gray-400">•</span>
                <span>{new Date(entry.date).toLocaleDateString()}</span>
            </div>

            {/* Description */}
            {entry.description && (
                <p className="text-gray-800 font-medium text-base mb-3 leading-relaxed">
                    {entry.description}
                </p>
            )}

            {/* Files preview */}
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

            {/* Extra content */}
            {entry.type === 'text' && entry.content && (
                <div className="mt-3 p-3 rounded-md bg-blue-50 text-blue-700 text-sm leading-snug">
                    {entry.content}
                </div>
            )}
        </li>
    );
}
