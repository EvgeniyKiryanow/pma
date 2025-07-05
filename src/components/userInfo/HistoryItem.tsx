import { CommentOrHistoryEntry } from '../../types/user';
import { Trash2 } from 'lucide-react';
import { useI18nStore } from '../../stores/i18nStore';

type Props = {
    entry: CommentOrHistoryEntry;
    onDelete: (id: number) => void;
};

export default function HistoryItem({ entry, onDelete }: Props) {
    const { t } = useI18nStore();

    return (
        <li className="bg-white p-6 rounded-lg shadow-md border border-gray-200 relative hover:shadow-lg transition-shadow">
            <button
                onClick={() => onDelete(entry.id)}
                className="absolute top-3 right-3 text-red-600 hover:text-red-800"
                title={t('historyItem.delete')}
            >
                <Trash2 className="w-5 h-5" />
            </button>

            <p className="text-sm text-gray-500 mb-1">
                <strong className="uppercase">{t(`historyItem.type.${entry.type}`)}</strong> —{' '}
                {new Date(entry.date).toLocaleDateString()}
            </p>

            {entry.description && (
                <p className="font-semibold text-gray-800 mb-3">{entry.description}</p>
            )}

            {entry.files?.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-3">
                    {entry.files.map((file, i) => (
                        <div
                            key={i}
                            className="border rounded-lg p-3 bg-gray-50 max-w-[200px] max-h-[200px] flex flex-col items-center justify-center text-center shadow-sm"
                        >
                            {file.dataUrl ? (
                                file.type === 'application/pdf' ? (
                                    <a
                                        href={file.dataUrl}
                                        download={file.name}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs underline text-blue-600"
                                    >
                                        📄 {t('historyItem.pdf')}: {file.name}
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
                                            className="w-[180px] h-[180px] object-contain rounded"
                                        />
                                    </a>
                                ) : (
                                    <a
                                        href={file.dataUrl}
                                        download={file.name}
                                        className="text-xs underline text-blue-600 break-words"
                                    >
                                        📎 {file.name}
                                    </a>
                                )
                            ) : (
                                <span className="text-xs">{file.name}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {entry.type === 'text' && entry.content && (
                <p className="text-sm text-blue-600 mt-3 break-words">{entry.content}</p>
            )}
        </li>
    );
}
