import { useEffect, useMemo, useState } from 'react';

import classifyStatusForReport from '../../../../../shared/helpers/classifyStatusForReport';
import { CommentOrHistoryEntry } from '../../../../../shared/types/user';
import {
    ShtatnaPosada,
    useShtatniStore,
} from '../../../../entities/shtatna-posada/model/useShtatniStore';
import { useUserStore } from '../../../../stores/userStore';
const STAFF_COLUMNS = [
    { key: 'shtatNumber', label: '№ посади' },
    { key: 'unit', label: 'Підрозділ' },
    { key: 'position', label: 'Посада' },
    { key: 'rank', label: 'В/звання' },
    { key: 'fullName', label: 'ПІБ' },
    { key: 'taxId', label: 'ІПН' },
    { key: 'statusInArea', label: 'статус в районі', background: '#fde9a9' },
    { key: 'distanceFromLVZ', label: 'Відстань від ЛВЗ (менше):', background: '#fde9a9' },
    { key: 'absenceReason', label: 'причина відсутності в районі', background: '#f8ccb0' },
    { key: 'dateFrom', label: 'дата з', background: '#f8ccb0' },
    { key: 'dateTo', label: 'дата по', background: '#f8ccb0' },
    { key: 'statusNote', label: 'помилка статусів', background: '#f7c7c7' },
];

export function StaffReportTable() {
    const { shtatniPosady, fetchAll, updatePosada } = useShtatniStore();
    const { users, fetchUsers } = useUserStore();

    const [editingData, setEditingData] = useState<Record<string, any>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [userHistories, setUserHistories] = useState<Record<number, CommentOrHistoryEntry[]>>({});

    useEffect(() => {
        if (shtatniPosady.length === 0) fetchAll();
        if (users.length === 0) fetchUsers();
    }, []);
    useEffect(() => {
        if (shtatniPosady.length === 0) fetchAll();
        if (users.length === 0) {
            fetchUsers();
        } else {
            const assignedUserIds = new Set(
                shtatniPosady
                    .map((pos) => {
                        const user = users.find((u) => u.shpkNumber == pos.shtat_number);
                        return user?.id;
                    })
                    .filter(Boolean),
            );

            const loadHistories = async () => {
                const result: Record<number, CommentOrHistoryEntry[]> = {};
                for (const userId of assignedUserIds) {
                    try {
                        const history = await window.electronAPI.getUserHistory(userId, 'all');
                        result[userId] = history;
                    } catch (err) {
                        console.warn(`❌ Failed to load history for user ${userId}`, err);
                    }
                }
                setUserHistories(result);
            };

            loadHistories();
        }
    }, [users, shtatniPosady]);

    const sorted = useMemo(() => {
        return [...shtatniPosady].sort((a, b) => {
            const nA = parseInt(a.shtat_number.replace(/\D/g, ''), 10) || 0;
            const nB = parseInt(b.shtat_number.replace(/\D/g, ''), 10) || 0;
            return nA - nB;
        });
    }, [shtatniPosady]);

    const allRows = useMemo(() => {
        return sorted.map((pos) => {
            const assignedUser = users.find((u) => u.shpkNumber == pos.shtat_number);
            const extra = pos.extra_data || {};
            const soldierStatus = assignedUser?.soldierStatus;

            const history = assignedUser?.id ? userHistories[assignedUser.id] || [] : [];
            const latestStatus = [...history]
                .reverse()
                .find((h) => h.type === 'statusChange' && h.period?.from);
            const dateFrom = latestStatus?.period?.from || extra.dateFrom || '';
            const dateTo = latestStatus?.period?.to || extra.dateTo || '';
            const classified = classifyStatusForReport(soldierStatus);

            return {
                shtatNumber: pos.shtat_number,
                unit: pos.unit_name || '',
                position: pos.position_name || '',
                fullName: assignedUser?.fullName || '',
                rank: assignedUser?.rank || '',
                taxId: assignedUser?.taxId || '',

                statusInArea: extra.statusInArea || classified.statusInArea,
                distanceFromLVZ: extra.distanceFromLVZ || '',
                absenceReason: extra.absenceReason || classified.absenceReason,
                dateFrom,
                dateTo,
                statusNote: extra.statusNote || '',
            };
        });
    }, [sorted, users, userHistories]);

    const reportRows = useMemo(() => {
        if (!searchTerm.trim()) return allRows;
        const lower = searchTerm.toLowerCase();
        return allRows.filter((row) =>
            Object.values(row).some((val) => String(val).toLowerCase().includes(lower)),
        );
    }, [allRows, searchTerm]);

    const handleEditChange = (shtatNumber: string, field: string, value: string) => {
        setEditingData((prev) => ({
            ...prev,
            [shtatNumber]: {
                ...prev[shtatNumber],
                [field]: value,
            },
        }));
    };

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
        <div className="relative border-4 border-black rounded-lg shadow bg-white overflow-auto max-w-full max-h-[80vh]">
            <table className="min-w-[2000px] text-[12px] border-collapse table-fixed">
                <thead className="sticky top-0 z-10 bg-gray-100">
                    <tr>
                        {STAFF_COLUMNS.map((col) => (
                            <th
                                key={col.key}
                                style={{
                                    backgroundColor: col.background || '#f0f0f0',
                                    color: '#000',
                                    border: '1px solid black',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    padding: '10px 6px',
                                    whiteSpace: 'nowrap',
                                    fontSize: '13px',
                                }}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {reportRows.map((row, idx) => {
                        const edit = editingData[row.shtatNumber] || {};
                        const isEven = idx % 2 === 0;

                        return (
                            <tr
                                key={row.shtatNumber}
                                className={isEven ? 'bg-white' : 'bg-gray-50'}
                            >
                                {STAFF_COLUMNS.map((col) => {
                                    const value = edit[col.key] ?? (row as any)[col.key];

                                    const editable = [
                                        'statusInArea',
                                        'distanceFromLVZ',
                                        'absenceReason',
                                        'dateFrom',
                                        'dateTo',
                                        'statusNote',
                                    ].includes(col.key);

                                    return (
                                        <td
                                            key={col.key}
                                            style={{
                                                backgroundColor: col.background || 'transparent',
                                                border: '1px solid black',
                                                padding: '6px 4px',
                                                textAlign: col.center ? 'center' : 'left',
                                                verticalAlign: 'top',
                                            }}
                                        >
                                            {editable ? (
                                                <input
                                                    type="text"
                                                    className="w-full text-[12px] rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-300 px-1 py-[3px]"
                                                    value={value}
                                                    onChange={(e) =>
                                                        handleEditChange(
                                                            row.shtatNumber,
                                                            col.key,
                                                            e.target.value,
                                                        )
                                                    }
                                                    onBlur={() => saveRowChanges(row.shtatNumber)}
                                                />
                                            ) : (
                                                <span
                                                    style={{
                                                        fontWeight: col.bold ? 'bold' : 'normal',
                                                    }}
                                                >
                                                    {value || ''}
                                                </span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}

                    {reportRows.length === 0 && (
                        <tr>
                            <td
                                colSpan={STAFF_COLUMNS.length}
                                className="p-6 text-center text-gray-500 italic"
                                style={{ border: '1px solid black' }}
                            >
                                ⏳ Даних немає або пошук не знайшов збігів
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
