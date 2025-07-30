import { useEffect, useState } from 'react';
import { useVyklyuchennyaStore } from '../../stores/useVyklyuchennyaStore';
import { useUserStore } from '../../stores/userStore';
import FilePreviewModal, { FileWithDataUrl } from '../../components/FilePreviewModal';
import { Trash2 } from 'lucide-react';

export default function VyklyucheniTab() {
    const { list, fetchAll, removeVyklyuchennya, clearAllVyklyuchennya } = useVyklyuchennyaStore();
    const users = useUserStore((s) => s.users);
    const [previewFile, setPreviewFile] = useState<FileWithDataUrl | null>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-red-800">❌ Виключення</h2>
                {list.length > 0 && (
                    <button
                        onClick={async () => {
                            if (confirm('Ви впевнені, що хочете видалити всі записи?')) {
                                clearAllVyklyuchennya();
                                await fetchAll();
                            }
                        }}
                        className="text-sm px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 shadow"
                    >
                        🗑 Очистити таблицю
                    </button>
                )}
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className="bg-red-100 text-red-900 font-semibold">
                        <tr>
                            <th className="px-4 py-2 border">#</th>
                            <th className="px-4 py-2 border">Користувач</th>
                            <th className="px-4 py-2 border">Підрозділ</th>
                            <th className="px-4 py-2 border">Посада</th>
                            <th className="px-4 py-2 border">Назва</th>
                            <th className="px-4 py-2 border">Опис</th>
                            <th className="px-4 py-2 border">Дата виключення</th>
                            <th className="px-4 py-2 border">Період (від)</th>
                            <th className="px-4 py-2 border">Файл</th>
                            <th className="px-4 py-2 border">Дія</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((entry, index) => {
                            const user = users.find((u) => u.id === entry.userId);
                            return (
                                <tr key={entry.id} className="hover:bg-red-50">
                                    <td className="px-4 py-2 border">{index + 1}</td>
                                    <td className="px-4 py-2 border font-medium text-gray-900">
                                        {user?.fullName || '—'}
                                    </td>
                                    <td className="px-4 py-2 border">{user?.unitMain || '—'}</td>
                                    <td className="px-4 py-2 border">{user?.position || '—'}</td>
                                    <td className="px-4 py-2 border">{entry.title}</td>
                                    <td className="px-4 py-2 border whitespace-pre-wrap">
                                        {entry.description || '—'}
                                    </td>
                                    <td className="px-4 py-2 border">
                                        {new Date(entry.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-2 border">
                                        {entry.periodFrom
                                            ? new Date(entry.periodFrom).toLocaleDateString()
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
                                    <td className="px-4 py-2 border text-center">
                                        <button
                                            onClick={async () => {
                                                if (confirm('Видалити цей запис?')) {
                                                    removeVyklyuchennya(entry.id);
                                                    await fetchAll();
                                                }
                                            }}
                                            className="text-red-600 hover:text-red-800"
                                            title="Видалити запис"
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

            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}
        </div>
    );
}
