import { useEffect } from 'react';
import { useRozporyadzhennyaStore } from '../../stores/useRozporyadzhennyaStore';
import { useUserStore } from '../../stores/userStore';
import { useState } from 'react';
import FilePreviewModal, { FileWithDataUrl } from '../../components/FilePreviewModal';

export default function RozporyadzhennyaTab() {
    const { entries, fetchAll } = useRozporyadzhennyaStore();
    const users = useUserStore((s) => s.users);

    const [previewFile, setPreviewFile] = useState<FileWithDataUrl | null>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold text-yellow-800 mb-4">📤 Розпорядження</h2>

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className="bg-yellow-100 text-yellow-900 font-semibold">
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
