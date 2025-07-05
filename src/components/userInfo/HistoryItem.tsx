import { CommentOrHistoryEntry } from '../../types/user';

type Props = {
    entry: CommentOrHistoryEntry;
    onDelete: (id: number) => void;
};

export default function HistoryItem({ entry, onDelete }: Props) {
    return (
        <li className="bg-gray-100 p-4 rounded shadow relative">
            <button
                onClick={() => onDelete(entry.id)}
                className="absolute top-2 right-2 text-red-600 hover:text-red-900 font-bold text-lg"
                title="Delete history entry"
                type="button"
            >
                ×
            </button>

            <p className="text-sm text-gray-600 mb-1">
                <strong>{entry.type.toUpperCase()}</strong> —{' '}
                {new Date(entry.date).toLocaleDateString()}
                {entry.author && ` by ${entry.author}`}
            </p>

            {entry.description && <p className="font-medium mb-2">{entry.description}</p>}

            {entry.files?.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    {entry.files.map((file, i) => (
                        <div
                            key={i}
                            className="border rounded p-2 max-w-[160px] max-h-[160px] flex flex-col items-center"
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
                                        PDF: {file.name}
                                    </a>
                                ) : file.type.startsWith('image/') ? (
                                    <a
                                        href={file.dataUrl}
                                        download={file.name}
                                        title={`Download ${file.name}`}
                                    >
                                        <img
                                            src={file.dataUrl}
                                            alt={file.name}
                                            className="w-32 h-32 object-contain rounded"
                                        />
                                    </a>
                                ) : (
                                    <a
                                        href={file.dataUrl}
                                        download={file.name}
                                        className="text-xs underline text-blue-600 break-words"
                                    >
                                        {file.name}
                                    </a>
                                )
                            ) : (
                                <span className="text-xs">{file.name}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </li>
    );
}
