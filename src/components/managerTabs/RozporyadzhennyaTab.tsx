import { useEffect } from 'react';
import { useRozporyadzhennyaStore } from '../../stores/useRozporyadzhennyaStore';

export default function RozporyadzhennyaTab() {
    const { entries, fetchAll } = useRozporyadzhennyaStore();

    useEffect(() => {
        fetchAll();
    }, []);
    console.log(entries, 'list');

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold text-yellow-800 mb-4">📤 Розпорядження</h2>

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className="bg-yellow-100 text-yellow-900 font-semibold">
                        <tr>
                            <th className="px-4 py-2 border">#</th>
                            <th className="px-4 py-2 border">User ID</th>
                            <th className="px-4 py-2 border">Назва</th>
                            <th className="px-4 py-2 border">Опис</th>
                            <th className="px-4 py-2 border">Дата розпорядження</th>
                            <th className="px-4 py-2 border">Період (від)</th>
                            <th className="px-4 py-2 border">Період (до)</th>
                            <th className="px-4 py-2 border">Файл</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry, index) => (
                            <tr
                                key={`${entry.userId}-${entry.date}-${index}`}
                                className="hover:bg-yellow-50"
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
                                    {entry.period?.from
                                        ? new Date(entry.period.from).toLocaleDateString()
                                        : '—'}
                                </td>
                                <td className="px-4 py-2 border">
                                    {entry.period?.to
                                        ? new Date(entry.period.to).toLocaleDateString()
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
