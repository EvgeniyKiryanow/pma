import { useEffect } from 'react';
import { useVyklyuchennyaStore } from '../../stores/useVyklyuchennyaStore';

export default function VyklyucheniTab() {
    const { list, fetchAll } = useVyklyuchennyaStore();

    useEffect(() => {
        fetchAll();
    }, []);

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold text-red-800 mb-4">❌ Виключення</h2>

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className="bg-red-100 text-red-900 font-semibold">
                        <tr>
                            <th className="px-4 py-2 border">#</th>
                            <th className="px-4 py-2 border">User ID</th>
                            <th className="px-4 py-2 border">Назва</th>
                            <th className="px-4 py-2 border">Опис</th>
                            <th className="px-4 py-2 border">Дата виключення</th>
                            <th className="px-4 py-2 border">Період (від)</th>
                            <th className="px-4 py-2 border">Файл</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((entry, index) => (
                            <tr
                                key={`${entry.userId}-${entry.date}-${index}`}
                                className="hover:bg-red-50"
                            >
                                <td className="px-4 py-2 border">{index + 1}</td>
                                <td className="px-4 py-2 border">{entry.userId}</td>
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
                                <td className="px-4 py-2 border">{entry.file?.name || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
