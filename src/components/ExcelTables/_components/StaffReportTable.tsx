import { useEffect, useMemo, useState } from 'react';
import { useShtatniStore, ShtatnaPosada } from '../../../stores/useShtatniStore';
import { useUserStore } from '../../../stores/userStore';
import classifyStatusForReport from '../../../helpers/classifyStatusForReport';

export function StaffReportTable() {
    const { shtatniPosady, fetchAll, updatePosada } = useShtatniStore();
    const { users, fetchUsers } = useUserStore();

    const [editingData, setEditingData] = useState<Record<string, any>>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (shtatniPosady.length === 0) fetchAll();
        if (users.length === 0) fetchUsers();
    }, []);

    // ✅ Sort by shtat_number numeric
    const sorted = useMemo(() => {
        return [...shtatniPosady].sort((a, b) => {
            const nA = parseInt(a.shtat_number.replace(/\D/g, ''), 10) || 0;
            const nB = parseInt(b.shtat_number.replace(/\D/g, ''), 10) || 0;
            return nA - nB;
        });
    }, [shtatniPosady]);

    // ✅ Merge with users & extra_data
    const allRows = useMemo(() => {
        return sorted.map((pos) => {
            const assignedUser = users.find(
                (u) => u.position === pos.position_name && u.unitMain === pos.unit_name,
            );

            const extra = pos.extra_data || {};
            const soldierStatus = assignedUser?.soldierStatus;

            // ✅ Classify soldierStatus → either in-area OR absenceReason
            const classified = classifyStatusForReport(soldierStatus);

            return {
                shtatNumber: pos.shtat_number,
                unit: pos.unit_name || '',
                position: pos.position_name || '',
                fullName: assignedUser?.fullName || '',
                rank: assignedUser?.rank || '',
                taxId: assignedUser?.taxId || '',

                // ✅ Prefer DB extra_data → fallback to soldierStatus auto classification
                statusInArea: extra.statusInArea || classified.statusInArea,
                distanceFromLVZ: extra.distanceFromLVZ || '',
                absenceReason: extra.absenceReason || classified.absenceReason,
                dateFrom: extra.dateFrom || '',
                dateTo: extra.dateTo || '',
                statusNote: extra.statusNote || '',
            };
        });
    }, [sorted, users]);

    // ✅ Filter by search
    const reportRows = useMemo(() => {
        if (!searchTerm.trim()) return allRows;
        const lower = searchTerm.toLowerCase();

        return allRows.filter((row) =>
            Object.values(row).some((val) => String(val).toLowerCase().includes(lower)),
        );
    }, [allRows, searchTerm]);

    // ✅ Handle edits
    const handleEditChange = (shtatNumber: string, field: string, value: string) => {
        setEditingData((prev) => ({
            ...prev,
            [shtatNumber]: {
                ...prev[shtatNumber],
                [field]: value,
            },
        }));
    };

    // ✅ Persist to DB
    const saveRowChanges = async (shtatNumber: string) => {
        const changes = editingData[shtatNumber];
        if (!changes) return;

        const posada = shtatniPosady.find((p) => p.shtat_number === shtatNumber);
        if (!posada) return;

        const mergedExtra = {
            ...(posada.extra_data || {}),
            ...changes,
        };

        const updatedPosada: ShtatnaPosada = {
            ...posada,
            extra_data: mergedExtra,
        };

        const ok = await updatePosada(updatedPosada);
        if (ok) {
            setEditingData((prev) => {
                const copy = { ...prev };
                delete copy[shtatNumber];
                return copy;
            });
        }
    };

    return (
        <div className="flex flex-col space-y-6">
            {/* ✅ Page Header */}
            <div className="flex flex-col gap-3">
                <h1 className="text-2xl font-bold text-gray-800">📊 Звіт по особовому складу</h1>
                <p className="text-gray-600 text-sm max-w-4xl leading-relaxed">
                    Тут відображено <b>усі штатні посади</b> та призначених на них
                    військовослужбовців. Ви можете <b>шукати</b> по будь-якому полю та{' '}
                    <b>редагувати дані</b> прямо в таблиці: статус у районі, відстань, причину
                    відсутності, дати та примітки.
                </p>

                {/* ✅ Search bar */}
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="🔍 Пошук по будь-якому полю..."
                        className="w-96 px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                        >
                            ❌ Очистити
                        </button>
                    )}
                </div>
            </div>

            {/* ✅ Table container */}
            <div className="overflow-x-auto border rounded-lg shadow bg-white">
                <table className="min-w-[1600px] text-sm border-collapse">
                    <thead>
                        <tr className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800">
                            <th className="border px-4 py-3">№ посади</th>
                            <th className="border px-4 py-3">Підрозділ</th>
                            <th className="border px-4 py-3">Посада</th>
                            <th className="border px-4 py-3">В/звання</th>
                            <th className="border px-4 py-3">ПІБ</th>
                            <th className="border px-4 py-3">ІПН</th>
                            <th className="border px-4 py-3 w-[250px]">Статус у районі</th>
                            <th className="border px-4 py-3 w-[180px]">Відстань від ЛВЗ</th>
                            <th className="border px-4 py-3 w-[250px]">Причина відсутності</th>
                            <th className="border px-4 py-3 w-[200px]">Дата з</th>
                            <th className="border px-4 py-3 w-[200px]">Дата по</th>
                            <th className="border px-4 py-3 w-[280px]">Помітка статусу</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportRows.map((row, idx) => {
                            const edit = editingData[row.shtatNumber] || {};
                            const isEven = idx % 2 === 0;

                            return (
                                <tr
                                    key={row.shtatNumber}
                                    className={`${isEven ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}
                                >
                                    {/* Static columns */}
                                    <td className="border px-4 py-3 font-medium">
                                        {row.shtatNumber}
                                    </td>
                                    <td className="border px-4 py-3">{row.unit}</td>
                                    <td className="border px-4 py-3">{row.position}</td>
                                    <td className="border px-4 py-3">{row.rank}</td>
                                    <td className="border px-4 py-3">{row.fullName}</td>
                                    <td className="border px-4 py-3">{row.taxId}</td>

                                    {/* Editable: Статус у районі */}
                                    <td className="border px-4 py-3">
                                        <input
                                            type="text"
                                            className="w-full rounded-md border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-100 px-2 py-1"
                                            value={edit.statusInArea ?? row.statusInArea}
                                            onChange={(e) =>
                                                handleEditChange(
                                                    row.shtatNumber,
                                                    'statusInArea',
                                                    e.target.value,
                                                )
                                            }
                                            onBlur={() => saveRowChanges(row.shtatNumber)}
                                        />
                                    </td>

                                    {/* Editable: Відстань */}
                                    <td className="border px-4 py-3">
                                        <input
                                            type="text"
                                            className="w-full rounded-md border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-100 px-2 py-1"
                                            value={edit.distanceFromLVZ ?? row.distanceFromLVZ}
                                            onChange={(e) =>
                                                handleEditChange(
                                                    row.shtatNumber,
                                                    'distanceFromLVZ',
                                                    e.target.value,
                                                )
                                            }
                                            onBlur={() => saveRowChanges(row.shtatNumber)}
                                        />
                                    </td>

                                    {/* Editable: Причина відсутності */}
                                    <td className="border px-4 py-3">
                                        <input
                                            type="text"
                                            className="w-full rounded-md border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-100 px-2 py-1"
                                            value={edit.absenceReason ?? row.absenceReason}
                                            onChange={(e) =>
                                                handleEditChange(
                                                    row.shtatNumber,
                                                    'absenceReason',
                                                    e.target.value,
                                                )
                                            }
                                            onBlur={() => saveRowChanges(row.shtatNumber)}
                                        />
                                    </td>

                                    {/* Editable: Дата з */}
                                    <td className="border px-4 py-3">
                                        <input
                                            type="text"
                                            placeholder="дата з..."
                                            className="w-full rounded-md border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-100 px-2 py-1"
                                            value={edit.dateFrom ?? row.dateFrom}
                                            onChange={(e) =>
                                                handleEditChange(
                                                    row.shtatNumber,
                                                    'dateFrom',
                                                    e.target.value,
                                                )
                                            }
                                            onBlur={() => saveRowChanges(row.shtatNumber)}
                                        />
                                    </td>

                                    {/* Editable: Дата по */}
                                    <td className="border px-4 py-3">
                                        <input
                                            type="text"
                                            placeholder="дата по..."
                                            className="w-full rounded-md border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-100 px-2 py-1"
                                            value={edit.dateTo ?? row.dateTo}
                                            onChange={(e) =>
                                                handleEditChange(
                                                    row.shtatNumber,
                                                    'dateTo',
                                                    e.target.value,
                                                )
                                            }
                                            onBlur={() => saveRowChanges(row.shtatNumber)}
                                        />
                                    </td>

                                    {/* Editable: Помітка статусу */}
                                    <td className="border px-4 py-3">
                                        <input
                                            type="text"
                                            placeholder="додати помітку..."
                                            className="w-full rounded-md border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-100 px-2 py-1"
                                            value={edit.statusNote ?? row.statusNote}
                                            onChange={(e) =>
                                                handleEditChange(
                                                    row.shtatNumber,
                                                    'statusNote',
                                                    e.target.value,
                                                )
                                            }
                                            onBlur={() => saveRowChanges(row.shtatNumber)}
                                        />
                                    </td>
                                </tr>
                            );
                        })}

                        {reportRows.length === 0 && (
                            <tr>
                                <td colSpan={12} className="p-8 text-center text-gray-500 italic">
                                    ⏳ Даних немає або пошук не знайшов збігів
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
