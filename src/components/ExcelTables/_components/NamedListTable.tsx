import React, { useMemo, useState, useEffect } from 'react';
import { useUserStore } from '../../../stores/userStore';
import { useNamedListStore } from '../../../stores/useNamedListStore';
import { StatusExcel } from '../../../utils/excelUserStatuses';

const ROWS_PER_TABLE = 14;
const months = [
    'Січень',
    'Лютий',
    'Березень',
    'Квітень',
    'Травень',
    'Червень',
    'Липень',
    'Серпень',
    'Вересень',
    'Жовтень',
    'Листопад',
    'Грудень',
];

const statusToShort: Record<StatusExcel, string> = {
    [StatusExcel.ABSENT_REHAB]: 'вп',
    [StatusExcel.ABSENT_REHAB_LEAVE]: 'вп',
    [StatusExcel.ABSENT_BUSINESS_TRIP]: 'вд',
    [StatusExcel.ABSENT_HOSPITALIZED]: 'гп',
    [StatusExcel.ABSENT_MEDICAL_COMPANY]: 'гп',
    [StatusExcel.ABSENT_WOUNDED]: '300',
    [StatusExcel.ABSENT_SZO]: 'сзч',
    [StatusExcel.ABSENT_KIA]: '200',
    [StatusExcel.ABSENT_MIA]: '500',
    [StatusExcel.ABSENT_VLK]: 'влк',
    [StatusExcel.MANAGEMENT]: 'воп',
    [StatusExcel.SUPPLY_COMBAT]: 'воп',
    [StatusExcel.SUPPLY_GENERAL]: 'воп',
    [StatusExcel.NON_COMBAT_NEWCOMERS]: '+',
    [StatusExcel.NON_COMBAT_LIMITED_FITNESS]: '+',
    [StatusExcel.NON_COMBAT_LIMITED_FITNESS_IN_COMBAT]: '+',
    [StatusExcel.HAVE_OFFER_TO_HOS]: '+',
    [StatusExcel.ABSENT_REHABED_ON]: 'зв',
    [StatusExcel.POSITIONS_INFANTRY]: 'воп',
    [StatusExcel.POSITIONS_UAV]: 'воп',
    [StatusExcel.POSITIONS_BRONEGROUP]: 'бч',
    [StatusExcel.POSITIONS_CREW]: 'воп',
    [StatusExcel.POSITIONS_CALCULATION]: 'воп',
    [StatusExcel.POSITIONS_RESERVE_INFANTRY]: 'воп',
    [StatusExcel.NO_STATUS]: '',
    [StatusExcel.NON_COMBAT_REFUSERS]: '',
};

type MonthKey = `${number}-${number}`; // e.g. "2025-08"

export function NamedListTable() {
    const users = useUserStore((s) => s.users);
    const { tables, activeKey, setActiveKey, createTable, updateCell, loadAllTables, deleteTable } =
        useNamedListStore();

    const [selMonth, setSelMonth] = useState<number>(new Date().getMonth());
    const [selYear, setSelYear] = useState<number>(new Date().getFullYear());

    const [activeYear, activeMonthIndex] = useMemo((): [number, number] => {
        if (activeKey) {
            const [y, m] = activeKey.split('-').map(Number);
            return [y, m - 1];
        }
        return [selYear, selMonth];
    }, [activeKey, selYear, selMonth]);
    useEffect(() => {
        let applied = false;

        const load = async () => {
            const store = useNamedListStore.getState();

            if (!store.loadedOnce) {
                await store.loadAllTables();

                const keys = Object.keys(store.tables);
                if (keys.length > 0 && !store.activeKey) {
                    store.setActiveKey(keys[0]);
                }
            }
        };

        const checkAndApplyStatuses = async () => {
            const now = new Date();
            const hour = now.getHours();

            if (applied || hour < 10) return;

            const todayKey = `${now.getFullYear()}-${(now.getMonth() + 1)
                .toString()
                .padStart(2, '0')}`;
            const store = useNamedListStore.getState();
            const currentRows = store.tables[todayKey];

            // ✅ Fix: Ensure activeKey is set to todayKey if not already
            if (!store.activeKey && currentRows) {
                store.setActiveKey(todayKey);
            }

            const updatedStore = useNamedListStore.getState();

            if (
                updatedStore.activeKey === todayKey &&
                currentRows &&
                currentRows.some((r) => r.attendance[now.getDate() - 1] === '')
            ) {
                await applyTodayStatuses();
                applied = true;
            }
        };

        load();

        const interval = setInterval(checkAndApplyStatuses, 10_000);
        return () => clearInterval(interval);
    }, []);

    const daysInActiveMonth = useMemo(() => {
        return new Date(activeYear, activeMonthIndex + 1, 0).getDate();
    }, [activeYear, activeMonthIndex]);

    const mk = (mo: number, yr: number): MonthKey =>
        `${yr}-${(mo + 1).toString().padStart(2, '0')}` as MonthKey;

    const handleCreate = () => {
        const key = mk(selMonth, selYear);
        if (tables[key]) {
            return setActiveKey(key);
        }

        const today = new Date();
        const todayKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
        const isSameDay = key === todayKey;
        const todayIndex = today.getDate() - 1;

        const existingRows = tables[todayKey] || [];

        const filteredUsers = users.filter((u) => {
            const raw = u.shpkNumber?.toString().trim() || '';
            const isValid = /^[0-9]+$/.test(raw);

            // ✅ Preserve users without shpkNumber only if they had values before today
            if (!isValid) {
                const old = existingRows.find((r) => r.fullName === u.fullName);
                if (!old) return false;

                const hasAny = old.attendance
                    .slice(0, todayIndex)
                    .some((val) => val && val.trim() !== '');
                return hasAny;
            }

            return true;
        });

        const base = filteredUsers.map((u, i) => {
            const old = existingRows.find((r) => r.fullName === u.fullName);

            const attendance = old ? [...old.attendance] : Array(daysInActiveMonth).fill('');

            // ✅ Only apply today's status if day matches and cell is empty
            if (isSameDay && !attendance[todayIndex]) {
                const short = statusToShort[u.soldierStatus as StatusExcel];
                if (short) {
                    attendance[todayIndex] = short;
                }
            }

            return {
                id: i + 1,
                rank: u.rank || '',
                shpkNumber: u.shpkNumber ?? '',
                fullName: u.fullName || '',
                attendance,
            };
        });

        while (base.length % ROWS_PER_TABLE !== 0) {
            base.push({
                id: base.length + 1,
                rank: '',
                shpkNumber: '',
                fullName: '',
                attendance: Array(daysInActiveMonth).fill(''),
            });
        }

        createTable(key, base);
        setActiveKey(key);
    };
    const applyTodayStatuses = async () => {
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${(today.getMonth() + 1)
            .toString()
            .padStart(2, '0')}`;

        let { activeKey } = useNamedListStore.getState();
        const { setActiveKey } = useNamedListStore.getState();
        const { tables } = useNamedListStore.getState();

        if (!activeKey && tables[todayKey]) {
            setActiveKey(todayKey);
            activeKey = todayKey;
        }

        if (!activeKey) {
            console.warn('🚫 applyTodayStatuses: No activeKey');
            return;
        }

        if (activeKey !== todayKey) {
            console.warn("🚫 applyTodayStatuses: Active key is not today's table");
            return;
        }

        const dayIndex = today.getDate() - 1;
        const currentRows = useNamedListStore.getState().tables[activeKey];
        if (!currentRows) {
            console.warn('🚫 applyTodayStatuses: No current rows for today');
            return;
        }

        const users = useUserStore.getState().users; // ✅ Fetch fresh users from store
        let appliedCount = 0;

        for (const user of users) {
            const short = statusToShort[user.soldierStatus as StatusExcel];
            if (!short || !user.shpkNumber) continue;

            const row = currentRows.find((r) => r.shpkNumber === user.shpkNumber);
            if (!row) {
                console.debug('🔍 User not found in table:', user.shpkNumber, user.fullName);
                continue;
            }

            if (!row.attendance[dayIndex]) {
                console.debug('✅ Applying status:', {
                    name: user.fullName,
                    shpkNumber: user.shpkNumber,
                    short,
                    dayIndex,
                });
                await updateCell(activeKey, row.id, dayIndex, short);
                appliedCount++;
            }
        }

        if (appliedCount > 0) {
            alert(`✅ Статуси підставлено в ІМЕННОМУ СПИСОКУ: ${appliedCount}`);
        } else {
            console.log('ℹ️ applyTodayStatuses: No statuses applied, possibly already filled.');
        }
    };

    // const applyTodayStatuses = async () => {
    //     if (!activeKey) return;

    //     const today = new Date();
    //     const todayKey = `${today.getFullYear()}-${(today.getMonth() + 1)
    //         .toString()
    //         .padStart(2, '0')}`;

    //     if (activeKey !== todayKey) {
    //         alert('❌ Поточна таблиця не відповідає сьогоднішньому місяцю.');
    //         return;
    //     }

    //     const dayIndex = today.getDate() - 1;
    //     const currentRows = useNamedListStore.getState().tables[activeKey];
    //     if (!currentRows) return;
    //     for (const user of users) {
    //         const short = statusToShort[user.soldierStatus as StatusExcel];
    //         if (!short || !user.shpkNumber) continue;

    //         const row = currentRows.find((r) => r.shpkNumber === user.shpkNumber); // ✅ match by shpkNumber
    //         if (!row) continue;

    //         if (!row.attendance[dayIndex]) {
    //             await updateCell(activeKey, row.id, dayIndex, short);
    //         }
    //     }

    //     alert('✅ Статуси підставлено лише в порожні клітинки');
    // };

    const currentRows = useMemo(() => {
        return activeKey && tables[activeKey] ? tables[activeKey] : [];
    }, [tables, activeKey]);

    const tableChunks = useMemo(() => {
        return Array.from({ length: Math.ceil(currentRows.length / ROWS_PER_TABLE) }, (_, pi) =>
            currentRows.slice(pi * ROWS_PER_TABLE, (pi + 1) * ROWS_PER_TABLE),
        );
    }, [currentRows]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-white border rounded-xl p-6 shadow-md space-y-6 md:space-y-0 md:flex md:items-center md:justify-between">
                {/* Left block: Create table */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-700 font-semibold text-sm flex items-center gap-1">
                            📅 <span>Місяць</span>
                        </span>
                        <select
                            value={selMonth}
                            onChange={(e) => setSelMonth(Number(e.target.value))}
                            className="px-3 py-2 border rounded-md text-sm w-[140px] bg-gray-50 hover:bg-gray-100 transition"
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-700 font-semibold text-sm flex items-center gap-1">
                            🗓 <span>Рік</span>
                        </span>
                        <input
                            type="number"
                            value={selYear}
                            onChange={(e) => setSelYear(Number(e.target.value))}
                            className="w-[100px] px-3 py-2 border rounded-md text-sm bg-gray-50 hover:bg-gray-100 transition"
                        />
                    </div>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition"
                    >
                        ➕ Створити / Перейти
                    </button>
                </div>

                {/* Right block: Existing tables + actions */}
                <div className="flex flex-wrap items-center gap-4 justify-end">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-700 font-semibold text-sm flex items-center gap-1">
                            📂 <span>Таблиця</span>
                        </span>
                        <select
                            value={activeKey || ''}
                            onChange={(e) => setActiveKey(e.target.value as MonthKey)}
                            className="px-3 py-2 border rounded-md text-sm w-[160px] bg-gray-50 hover:bg-gray-100 transition"
                        >
                            <option disabled value="">
                                — виберіть —
                            </option>
                            {Object.keys(tables).map((key) => {
                                const [y, m] = key.split('-').map(Number);
                                return (
                                    <option key={key} value={key}>
                                        {months[m - 1]} {y}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {activeKey && (
                        <button
                            onClick={async () => {
                                const confirm = window.confirm(
                                    `Ви впевнені, що хочете видалити таблицю: ${activeKey}?`,
                                );
                                if (!confirm) return;
                                await deleteTable(activeKey);
                                setActiveKey(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition"
                        >
                            🗑 Видалити
                        </button>
                    )}

                    <button
                        onClick={applyTodayStatuses}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition"
                    >
                        📌 Підставити статуси
                    </button>
                </div>
            </div>

            {!activeKey && (
                <div className="text-center text-gray-500 italic">Створіть або оберіть таблицю</div>
            )}

            {/* Render all chunks */}
            {activeKey &&
                tableChunks.map((group, gi) => (
                    <div key={gi} className="space-y-4">
                        {gi > 0 && (
                            <p className="text-center text-gray-600">Продовження Додатка 4</p>
                        )}
                        {gi === 0 && (
                            <div className="text-center text-gray-800">
                                <h1 className="text-xl font-bold uppercase">ІМЕННИЙ СПИСОК</h1>
                                <p className="text-sm">для проведення вечірньої повірки</p>
                                <p className="text-sm font-medium">
                                    3 МЕХАНІЗОВАНА РОТА 1 МЕХАНІЗОВАНОГО БАТАЛЬЙОНУ
                                </p>
                            </div>
                        )}

                        <div className="overflow-auto border rounded-lg shadow">
                            <table className="min-w-[1000px] border border-gray-300 text-sm text-center">
                                <thead className="bg-gray-100 text-gray-700">
                                    <tr>
                                        <th rowSpan={3} className="border p-1 w-12">
                                            №<br />
                                            з/п
                                        </th>
                                        <th rowSpan={3} className="border p-1 w-28">
                                            Військове
                                            <br />
                                            звання
                                        </th>
                                        <th rowSpan={3} className="border p-1 w-40">
                                            Прізвище,
                                            <br />
                                            власне ім’я
                                        </th>
                                        <th colSpan={daysInActiveMonth} className="border p-1">
                                            {months[activeMonthIndex]}
                                        </th>
                                    </tr>
                                    <tr>
                                        <th colSpan={daysInActiveMonth} className="border p-1">
                                            Дні місяця
                                        </th>
                                    </tr>
                                    <tr>
                                        {Array.from(
                                            { length: daysInActiveMonth },
                                            (_, i) => i + 1,
                                        ).map((day) => (
                                            <th key={day} className="border p-1 w-8">
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50">
                                            <td className="border p-1">{row.id}</td>
                                            <td className="border p-1">{row.rank}</td>
                                            <td className="border p-1 text-left">{row.fullName}</td>
                                            {row.attendance
                                                .slice(0, daysInActiveMonth)
                                                .map((val, di) => (
                                                    <td key={di} className="border p-0.5">
                                                        <input
                                                            type="text"
                                                            maxLength={3}
                                                            value={val}
                                                            onChange={(e) =>
                                                                updateCell(
                                                                    activeKey!,
                                                                    row.id,
                                                                    di,
                                                                    e.target.value,
                                                                )
                                                            }
                                                            className="w-full text-center text-xs bg-transparent outline-none border-none"
                                                        />
                                                    </td>
                                                ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
        </div>
    );
}
