import { useEffect, useState } from 'react';
import { useRozporyadzhennyaStore } from '../../stores/useRozporyadzhennyaStore';
import { useUserStore } from '../../stores/userStore';
import FilePreviewModal, { FileWithDataUrl } from '../../components/FilePreviewModal';
import { Trash2, EyeOff, Eye } from 'lucide-react';
import LeftBar from './LeftBar';
import RightBar from './RightBar';

export default function RozporyadzhennyaTab() {
    const { entries, fetchAll, removeEntry, clearAllEntries } = useRozporyadzhennyaStore();
    const [previewFile, setPreviewFile] = useState<FileWithDataUrl | null>(null);
    const [showTable, setShowTable] = useState(true);
    const { users, updateUser } = useUserStore();
    const orderedUsers = users.filter((u) => u.shpkNumber === 'order');

    useEffect(() => {
        fetchAll();
    }, []);

    const handleDeleteEntry = async (userId: number, date: string) => {
        await removeEntry(userId, date); // shpkNumber is updated inside the store
    };

    const handleDeleteAll = async () => {
        if (confirm('Ви впевнені, що хочете видалити всі розпорядження?')) {
            await clearAllEntries(); // shpkNumber is updated inside the store
            await fetchAll();
        }
    };

    return (
        <div className="flex flex-col h-full p-4 space-y-6 overflow-hidden">
            {/* Header Controls */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-yellow-800">📤 Розпорядження</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowTable(!showTable)}
                        className="px-3 py-1 rounded-md border text-sm text-gray-700 hover:bg-yellow-100"
                    >
                        {showTable ? (
                            <span className="flex items-center gap-1">
                                <EyeOff className="w-4 h-4" /> Приховати
                            </span>
                        ) : (
                            <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" /> Показати
                            </span>
                        )}
                    </button>

                    <button
                        onClick={handleDeleteAll}
                        className="px-3 py-1 rounded-md border border-red-300 text-sm text-red-700 hover:bg-red-100"
                    >
                        🗑 Видалити всі
                    </button>
                </div>
            </div>

            {/* Table */}
            {showTable && (
                <div className="max-h-[320px] overflow-auto border rounded-lg shadow-sm bg-white">
                    <table className="min-w-full text-sm text-left border-collapse">
                        <thead className="sticky top-0 bg-yellow-100 text-yellow-900 font-semibold z-10">
                            <tr>
                                <th className="px-4 py-2 border">#</th>
                                <th className="px-4 py-2 border">Користувач</th>
                                <th className="px-4 py-2 border">Підрозділ</th>
                                <th className="px-4 py-2 border">Посада</th>
                                <th className="px-4 py-2 border">Назва</th>
                                <th className="px-4 py-2 border">Опис</th>
                                <th className="px-4 py-2 border">Дата розпорядження</th>
                                <th className="px-4 py-2 border">Період (від)</th>
                                <th className="px-4 py-2 border">Період (до)</th>
                                <th className="px-4 py-2 border">Файл</th>
                                <th className="px-4 py-2 border">Дія</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, index) => {
                                const user = users.find((u) => u.id === entry.userId);
                                return (
                                    <tr
                                        key={`${entry.userId}-${entry.date}-${index}`}
                                        className="hover:bg-yellow-50"
                                    >
                                        <td className="px-4 py-2 border">{index + 1}</td>
                                        <td className="px-4 py-2 border font-medium text-gray-900">
                                            {user?.fullName || '—'}
                                        </td>
                                        <td className="px-4 py-2 border">
                                            {user?.unitMain || '—'}
                                        </td>
                                        <td className="px-4 py-2 border">
                                            {user?.position || '—'}
                                        </td>
                                        <td className="px-4 py-2 border">{entry.title}</td>
                                        <td className="px-4 py-2 border whitespace-pre-wrap">
                                            {entry.description || '—'}
                                        </td>
                                        <td className="px-4 py-2 border">
                                            {new Date(entry.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-2 border">
                                            {entry.period?.from
                                                ? new Date(entry.period.from).toLocaleDateString()
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-2 border">
                                            {entry.period?.to
                                                ? new Date(entry.period.to).toLocaleDateString()
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-2 border">
                                            {entry.file ? (
                                                <button
                                                    onClick={() => setPreviewFile(entry.file)}
                                                    className="text-blue-600 underline hover:text-blue-800"
                                                >
                                                    {entry.file.name}
                                                </button>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-4 py-2 border">
                                            <button
                                                onClick={() =>
                                                    handleDeleteEntry(entry.userId, entry.date)
                                                }
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Bars Layout */}
            <div className="flex flex-1 overflow-hidden border rounded-xl shadow bg-white">
                <LeftBar users={orderedUsers} />
                <RightBar />
            </div>

            {/* File Preview */}
            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}
        </div>
    );
}
