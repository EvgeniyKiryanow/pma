import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
    ShtatnaPosada,
    useShtatniStore,
} from '../../../../entities/shtatna-posada/model/useShtatniStore';
import { reportError } from '../../../../shared/api/errors';
import { useI18nStore } from '../../../../stores/i18nStore';
import { useUserStore } from '../../../../stores/userStore';
import {
    activeFilterCount,
    buildStaffRows,
    filterStaffRows,
    sortStaffRows,
    type StaffRow,
    type StaffSortKey,
} from '../../model/staffReport';
import { useStaffReportView } from '../../model/staffReportStore';

const STAFF_COLUMNS: { key: StaffSortKey; label: string; background?: string }[] = [
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
    { key: 'awards', label: 'Нагороди', background: '#fff2cc' },
];

/** Columns a person fills in the report itself (stored with the position in the БЧС). */
const EDITABLE = new Set<StaffSortKey>([
    'statusInArea',
    'distanceFromLVZ',
    'absenceReason',
    'dateFrom',
    'dateTo',
    'statusNote',
]);

export function StaffReportTable() {
    const { t } = useI18nStore();
    const { shtatniPosady, fetchAll, updatePosada } = useShtatniStore();
    const users = useUserStore((s) => s.users);
    const fetchUsers = useUserStore((s) => s.fetchUsers);
    const historyVersion = useUserStore((s) => s.historyVersion);
    const { periods, filter, sort, setSort, resetFilter, loadPeriods } = useStaffReportView();
    const [editingData, setEditingData] = useState<Record<string, Partial<StaffRow>>>({});

    useEffect(() => {
        if (shtatniPosady.length === 0) void fetchAll();
        if (users.length === 0) void fetchUsers();
    }, []);

    // The dates of the latest status of everyone: one query, not a history per person.
    useEffect(() => {
        loadPeriods().catch((error) => reportError(error, { context: 'staff-report.periods' }));
    }, [historyVersion, users]);

    const allRows = useMemo(
        () => buildStaffRows(shtatniPosady, users, periods),
        [shtatniPosady, users, periods],
    );
    const reportRows = useMemo(
        () => sortStaffRows(filterStaffRows(allRows, filter), sort),
        [allRows, filter, sort],
    );

    /** Unsorted → ascending → descending → the order of the БЧС. */
    const toggleSort = (key: StaffSortKey) => {
        if (sort?.key !== key) setSort({ key, direction: 'asc' });
        else if (sort.direction === 'asc') setSort({ key, direction: 'desc' });
        else setSort(null);
    };

    const handleEditChange = (shtatNumber: string, field: StaffSortKey, value: string) => {
        setEditingData((prev) => ({
            ...prev,
            [shtatNumber]: { ...prev[shtatNumber], [field]: value },
        }));
    };

    const saveRowChanges = async (shtatNumber: string) => {
        const changes = editingData[shtatNumber];
        if (!changes) return;
        const posada = shtatniPosady.find((p) => p.shtat_number === shtatNumber);
        if (!posada) return;
        const updatedPosada: ShtatnaPosada = {
            ...posada,
            extra_data: { ...(posada.extra_data || {}), ...changes },
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
        <div className="paper relative max-h-[calc(100vh-290px)] max-w-full overflow-auto">
            <table className="min-w-[2000px] table-fixed border-collapse text-[12px]">
                <thead className="sticky top-0 z-10 bg-gray-100">
                    <tr>
                        {STAFF_COLUMNS.map((col) => {
                            const sorted = sort?.key === col.key ? sort.direction : null;
                            const Arrow =
                                sorted === 'asc'
                                    ? ArrowUp
                                    : sorted === 'desc'
                                      ? ArrowDown
                                      : ArrowUpDown;
                            return (
                                <th
                                    key={col.key}
                                    aria-sort={
                                        sorted === 'asc'
                                            ? 'ascending'
                                            : sorted === 'desc'
                                              ? 'descending'
                                              : 'none'
                                    }
                                    style={{
                                        backgroundColor: col.background || '#f0f0f0',
                                        color: '#000',
                                        border: '1px solid black',
                                        padding: 0,
                                        fontSize: '13px',
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleSort(col.key)}
                                        title={t('staffFilters.sortHint')}
                                        className="group flex w-full items-center justify-center gap-1 whitespace-nowrap px-1.5 py-2.5 font-bold hover:bg-black/5"
                                    >
                                        {col.label}
                                        <Arrow
                                            className={
                                                sorted
                                                    ? 'size-3.5 shrink-0'
                                                    : 'size-3.5 shrink-0 opacity-25 group-hover:opacity-70'
                                            }
                                        />
                                    </button>
                                </th>
                            );
                        })}
                    </tr>
                </thead>

                <tbody>
                    {reportRows.map((row, idx) => {
                        const edit = editingData[row.shtatNumber] || {};
                        return (
                            <tr
                                key={row.shtatNumber}
                                className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                            >
                                {STAFF_COLUMNS.map((col) => {
                                    const value = String(edit[col.key] ?? row[col.key] ?? '');
                                    return (
                                        <td
                                            key={col.key}
                                            style={{
                                                backgroundColor: col.background || 'transparent',
                                                border: '1px solid black',
                                                padding: '6px 4px',
                                                textAlign: 'left',
                                                verticalAlign: 'top',
                                            }}
                                        >
                                            {EDITABLE.has(col.key) ? (
                                                <input
                                                    type="text"
                                                    className="w-full rounded border border-gray-300 bg-white px-1 py-[3px] text-[12px] text-gray-900 outline-none focus:border-olive-600 focus:ring-2 focus:ring-olive-300/60"
                                                    value={value}
                                                    onChange={(e) =>
                                                        handleEditChange(
                                                            row.shtatNumber,
                                                            col.key,
                                                            e.target.value,
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        void saveRowChanges(row.shtatNumber)
                                                    }
                                                />
                                            ) : (
                                                <span>{value}</span>
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
                                className="p-6 text-center italic text-gray-500"
                                style={{ border: '1px solid black' }}
                            >
                                {activeFilterCount(filter) > 0 ? (
                                    <>
                                        {t('staffFilters.nothingFound')}{' '}
                                        <button
                                            type="button"
                                            onClick={resetFilter}
                                            className="font-medium not-italic text-olive-700 underline"
                                        >
                                            {t('staffFilters.resetAll')}
                                        </button>
                                    </>
                                ) : (
                                    t('staffFilters.noPositions')
                                )}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
