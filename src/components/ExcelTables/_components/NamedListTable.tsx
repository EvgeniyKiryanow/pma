import React, { useMemo, useState } from 'react';
import { useUserStore } from '../../../stores/userStore';
import { useNamedListStore } from '../../../stores/useNamedListStore';

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

type MonthKey = `${number}-${number}`; // e.g. "2025-08"

export function NamedListTable() {
    const users = useUserStore((s) => s.users);
    const { tables, activeKey, setActiveKey, createTable, updateCell } = useNamedListStore();

    // Controls for creating
    const [selMonth, setSelMonth] = useState<number>(new Date().getMonth());
    const [selYear, setSelYear] = useState<number>(new Date().getFullYear());

    // Extract year & month from activeKey, or fallback to selected for header
    const [activeYear, activeMonthIndex] = useMemo((): [number, number] => {
        if (activeKey) {
            const [y, m] = activeKey.split('-').map(Number);
            return [y, m - 1];
        }
        return [selYear, selMonth];
    }, [activeKey, selYear, selMonth]);

    // Real number of days in the active month
    const daysInActiveMonth = useMemo(() => {
        return new Date(activeYear, activeMonthIndex + 1, 0).getDate();
    }, [activeYear, activeMonthIndex]);

    // Helper to build a MonthKey
    const mk = (mo: number, yr: number): MonthKey => `${yr}-${mo + 1}` as MonthKey;

    // Create or switch to a table
    const handleCreate = () => {
        const key = mk(selMonth, selYear);
        if (tables[key]) {
            return setActiveKey(key);
        }

        // Build base rows with correct length attendance
        const base = users.map((u, i) => ({
            id: i + 1,
            rank: u.rank || '',
            fullName: u.fullName || '',
            attendance: Array(daysInActiveMonth).fill(''),
        }));
        // pad to multiple of 14
        while (base.length % ROWS_PER_TABLE !== 0) {
            base.push({
                id: base.length + 1,
                rank: '',
                fullName: '',
                attendance: Array(daysInActiveMonth).fill(''),
            });
        }

        createTable(key, base);
        setActiveKey(key);
    };

    // Rows for the active table
    const currentRows = useMemo(() => {
        return activeKey && tables[activeKey] ? tables[activeKey] : [];
    }, [tables, activeKey]);

    // Chunk into 14-row tables
    const tableChunks = useMemo(() => {
        return Array.from({ length: Math.ceil(currentRows.length / ROWS_PER_TABLE) }, (_, pi) =>
            currentRows.slice(pi * ROWS_PER_TABLE, (pi + 1) * ROWS_PER_TABLE),
        );
    }, [currentRows]);

    return (
        <div className="space-y-8">
            {/* Selector */}
            <div className="bg-white border rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">🗓 Таблиця:</span>
                    <select
                        value={selMonth}
                        onChange={(e) => setSelMonth(Number(e.target.value))}
                        className="px-3 py-2 border rounded-md text-sm"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i}>
                                {m}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        value={selYear}
                        onChange={(e) => setSelYear(Number(e.target.value))}
                        className="w-24 px-3 py-2 border rounded-md text-sm"
                    />
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                    >
                        ➕ Створити/Перейти
                    </button>
                </div>

                {Object.keys(tables).length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">📂 Обрати:</span>
                        <select
                            value={activeKey || ''}
                            onChange={(e) => setActiveKey(e.target.value as MonthKey)}
                            className="px-3 py-2 border rounded-md text-sm"
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
                )}
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
