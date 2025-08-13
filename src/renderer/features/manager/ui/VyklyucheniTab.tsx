import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import FilePreviewModal, { FileWithDataUrl } from '../../../../components/FilePreviewModal';
import { useUserStore } from '../../../../stores/userStore';
import { useVyklyuchennyaStore } from '../../../../stores/useVyklyuchennyaStore';
import LeftBar from './LeftBar';
import RightBar from './RightBar';

export default function VyklyucheniTab() {
    const { list, fetchAll, removeVyklyuchennya, clearAllVyklyuchennya } = useVyklyuchennyaStore();
    const users = useUserStore((s) => s.users);
    const excludedUsers = users.filter((u) => u.shpkNumber === 'excluded');
    const [previewFile, setPreviewFile] = useState<FileWithDataUrl | null>(null);
    const [activeView, setActiveView] = useState<'table' | 'bars'>('table');

    useEffect(() => {
        fetchAll();
    }, []);

    const handleDeleteAll = async () => {
        if (confirm('Ви впевнені, що хочете видалити всі записи?')) {
            await clearAllVyklyuchennya();
            await fetchAll();
        }
    };

    return (
        <div className="flex flex-col h-full p-4 space-y-4 overflow-hidden">
            {/* Tab Header */}
            <div className="flex items-center border-b border-gray-200">
                <div className="flex space-x-2">
                    <button
                        onClick={() => setActiveView('table')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                            activeView === 'table'
                                ? 'bg-red-200 text-red-900 border border-b-transparent'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        📋 Таблиця
                    </button>
                    <button
                        onClick={() => setActiveView('bars')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                            activeView === 'bars'
                                ? 'bg-red-200 text-red-900 border border-b-transparent'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        🧾 Штат / виключенний
                    </button>
                </div>
            </div>

            {/* Active View: Table */}
            {activeView === 'table' && (
                <>
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-red-800">Список виключень</h2>
                        {list.length > 0 && (
                            <button
                                onClick={handleDeleteAll}
                                className="px-4 py-1.5 text-sm rounded-md bg-red-100 hover:bg-red-200 text-red-700 border border-red-300"
                            >
                                🗑 Очистити таблицю
                            </button>
                        )}
                    </div>

                    <div className="max-h-[320px] overflow-auto border rounded-lg shadow-sm bg-white">
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="sticky top-0 bg-red-100 text-red-900 font-semibold z-10">
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
                                                {entry.periodFrom
                                                    ? new Date(
                                                          entry.periodFrom,
                                                      ).toLocaleDateString()
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
                                                            await removeVyklyuchennya(entry.id);
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
                </>
            )}

            {/* Active View: Bars */}
            {activeView === 'bars' && (
                <div className="flex flex-1 overflow-hidden border rounded-xl shadow bg-white">
                    <LeftBar users={excludedUsers} />
                    <RightBar />
                </div>
            )}

            {/* Preview */}
            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}
        </div>
    );
}
