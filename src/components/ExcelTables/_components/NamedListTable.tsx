import React, { JSX, useEffect, useMemo, useRef, useState } from 'react';

import { AttendanceRow, useNamedListStore } from '../../../stores/useNamedListStore';
import { useRozporyadzhennyaStore } from '../../../stores/useRozporyadzhennyaStore';
import { useUserStore } from '../../../stores/userStore';
import { useVyklyuchennyaStore } from '../../../stores/useVyklyuchennyaStore';
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
function normStr(s: string) {
    return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function keyByNameRank(fullName?: string, rank?: string) {
    return `${normStr(fullName || '')}|${normStr(rank || '')}`;
}

const statusToShort: Record<StatusExcel, string> = {
    [StatusExcel.ABSENT_REHAB]: 'вп',
    [StatusExcel.ABSENT_REHAB_LEAVE]: 'вп',
    [StatusExcel.ABSENT_BUSINESS_TRIP]: 'вд',
    [StatusExcel.ABSENT_HOSPITALIZED]: 'гп',
    [StatusExcel.ABSENT_MEDICAL_COMPANY]: '+',
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

type MonthKey = `${number}-${number}`; // "2025-08"

function mkMonthKey(monthIndex: number, year: number): MonthKey {
    return `${year}-${(monthIndex + 1).toString().padStart(2, '0')}` as MonthKey;
}
function todayKey(): MonthKey {
    const now = new Date();
    return mkMonthKey(now.getMonth(), now.getFullYear());
}
function daysInMonth(y: number, mIndex: number) {
    return new Date(y, mIndex + 1, 0).getDate();
}
function normToken(v: string) {
    return v.replace(/\s+/g, '').slice(0, 3); // без пробілів, максимум 3 символи
}

/** Легкий дебаунс для onChange клітинок */
function useDebouncedCallback<T extends any[]>(
    cb: (...args: T) => void | Promise<void>,
    delay = 180,
) {
    const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    return (...args: T) => {
        if (tRef.current) clearTimeout(tRef.current);
        tRef.current = setTimeout(() => cb(...args), delay);
    };
}

export function startNamedListAutoApply() {
    let applied = false;

    const tick = async () => {
        if (document.hidden) return; // не дратуємо, якщо вкладка не активна

        const now = new Date();
        if (applied || now.getHours() < 10) return;

        const key = todayKey();
        const dayIndex = now.getDate() - 1;

        const nl = useNamedListStore.getState();
        const rows = nl.tables[key];
        if (!rows) return;

        // якщо сьогоднішня колонка вже заповнена — не чіпаємо
        if (rows.every((r) => r.attendance[dayIndex] !== '')) return;

        if (nl.activeKey !== key) {
            console.warn('🚫 [Auto Apply] Пропущено: activeKey ≠ today', nl.activeKey, key);
            return;
        }

        console.log('⏰ [Auto Apply] Старт…');

        const users = useUserStore.getState().users;
        const byShpk = new Map<string, (typeof users)[number]>();
        for (const u of users) {
            const num = (u.shpkNumber ?? '').toString().trim();
            if (num) byShpk.set(num, u);
        }

        let appliedCount = 0;
        for (const row of rows) {
            if (!row.shpkNumber) continue;
            const u = byShpk.get(String(row.shpkNumber));
            if (!u) continue;

            const short = statusToShort[u.soldierStatus as StatusExcel] ?? '';
            if (!short) continue;

            if (!row.attendance[dayIndex]) {
                await nl.updateCell(key, row.id, dayIndex, short);
                appliedCount++;
            }
        }

        console.log(
            appliedCount > 0
                ? `✅ [Auto Apply] Підставлено: ${appliedCount}`
                : 'ℹ️ [Auto Apply] Нічого не підставлено — вже заповнено',
        );

        applied = true;
    };

    const interval = setInterval(tick, 10_000);
    const vis = () => !document.hidden && tick();
    document.addEventListener('visibilitychange', vis);

    return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', vis);
    };
}

export function NamedListTable() {
    const users = useUserStore((s) => s.users);
    const {
        tables,
        activeKey,
        setActiveKey,
        createTable,
        updateCell,
        deleteTable,
        loadAllTables,
        loadedOnce,
    } = useNamedListStore();

    const ordersList = useRozporyadzhennyaStore((s) => s.entries);
    const vyklyuchennyaList = useVyklyuchennyaStore((s) => s.list);

    // обраний місяць/рік у контролах
    const [selMonth, setSelMonth] = useState<number>(new Date().getMonth());
    const [selYear, setSelYear] = useState<number>(new Date().getFullYear());
    const usersByNameRank = useMemo(() => {
        const m = new Map<string, (typeof users)[number]>();
        for (const u of users) {
            m.set(keyByNameRank(u.fullName, u.rank), u);
        }
        return m;
    }, [users]);

    // 1) Початкове завантаження та автопризначення активної таблиці
    useEffect(() => {
        (async () => {
            if (!loadedOnce) {
                await loadAllTables();
            }
            const tKey = todayKey();
            if (
                !useNamedListStore.getState().activeKey &&
                useNamedListStore.getState().tables[tKey]
            ) {
                setActiveKey(tKey);
            }
        })();
    }, [loadedOnce, loadAllTables, setActiveKey]);

    // 2) Синхронне оновлення списків виключень/розпоряджень
    useEffect(() => {
        useVyklyuchennyaStore.getState().fetchAll();
        useRozporyadzhennyaStore.getState().fetchAll();
    }, []);

    // 3) Авто-підстановка (зовнішній керований цикл)
    useEffect(() => {
        const stop = startNamedListAutoApply();
        return stop;
    }, []);

    // Активні рік/місяць із activeKey або з контролів
    const [activeYear, activeMonthIndex] = useMemo<[number, number]>(() => {
        if (activeKey) {
            const [y, m] = activeKey.split('-').map(Number);
            return [y, (m || 1) - 1];
        }
        return [selYear, selMonth];
    }, [activeKey, selMonth, selYear]);

    const daysInActiveMonth = useMemo(
        () => daysInMonth(activeYear, activeMonthIndex),
        [activeYear, activeMonthIndex],
    );

    // Кеші мапи для швидкого доступу
    const usersByShpk = useMemo(() => {
        const m = new Map<string, (typeof users)[number]>();
        for (const u of users) {
            const num = (u.shpkNumber ?? '').toString().trim();
            if (num) m.set(num, u);
        }
        return m;
    }, [users]);

    // Об’єднана мапа виключень (vyklyuchennya/rozporyadzhennya) -> перший день застосування в активному місяці
    const exclusionsByUserId = useMemo(() => {
        const m = new Map<
            number,
            { description: string; periodFrom: string; startIndex: number }
        >();

        const calcStartIndex = (from: string) => {
            for (let i = 0; i < daysInActiveMonth; i++) {
                const dayDate = new Date(activeYear, activeMonthIndex, i + 1);
                if (dayDate >= new Date(from)) return i;
            }
            return -1;
        };

        for (const v of vyklyuchennyaList) {
            const start = calcStartIndex(v.periodFrom);
            if (start >= 0) {
                m.set(v.userId, {
                    description: v.description ?? '',
                    periodFrom: v.periodFrom,
                    startIndex: start,
                });
            }
        }
        for (const o of ordersList) {
            if (!o.period?.from) continue;
            // не перетираємо вже існуюче виключення з vyklyuchennya
            if (m.has(o.userId)) continue;
            const start = calcStartIndex(o.period.from);
            if (start >= 0) {
                m.set(o.userId, {
                    description: o.description ?? o.title ?? '',
                    periodFrom: o.period.from,
                    startIndex: start,
                });
            }
        }
        return m;
    }, [ordersList, vyklyuchennyaList, activeYear, activeMonthIndex, daysInActiveMonth]);

    const currentRows = useMemo<AttendanceRow[]>(() => {
        return activeKey && tables[activeKey] ? tables[activeKey] : [];
    }, [tables, activeKey]);

    const tableChunks = useMemo(() => {
        const n = Math.ceil(currentRows.length / ROWS_PER_TABLE);
        return Array.from({ length: n }, (_, pi) =>
            currentRows.slice(pi * ROWS_PER_TABLE, (pi + 1) * ROWS_PER_TABLE),
        );
    }, [currentRows]);

    const handleCreate = () => {
        const key = mkMonthKey(selMonth, selYear);
        if (tables[key]) {
            setActiveKey(key);
            return;
        }

        const tKey = todayKey();
        const isSameMonth = key === tKey;
        const todayIndex = new Date().getDate() - 1;

        const existingRows = tables[key] || [];

        // відбираємо тільки валідні шткп і не виключених
        const filteredUsers = users.filter((u) => {
            const raw = u.shpkNumber?.toString().trim() || '';
            const isValid = /^[0-9]+$/.test(raw);
            if (!isValid) return false;

            const excludedByV = vyklyuchennyaList.some(
                (entry) =>
                    entry.userId === u.id &&
                    new Date(entry.periodFrom).getFullYear() === selYear &&
                    new Date(entry.periodFrom).getMonth() === selMonth,
            );
            if (excludedByV) return false;

            const excludedByO = ordersList.some(
                (entry) =>
                    entry.userId === u.id &&
                    new Date(entry.period.from).getFullYear() === selYear &&
                    new Date(entry.period.from).getMonth() === selMonth,
            );
            if (excludedByO) return false;

            const str = String(u.shpkNumber ?? '');
            if (str.includes('_order') || str.includes('order_')) return false;

            return true;
        });

        const base: AttendanceRow[] = filteredUsers.map((u, i) => {
            const old = existingRows.find(
                (r) => keyByNameRank(r.fullName, r.rank) === keyByNameRank(u.fullName, u.rank),
            );

            const attendance = old ? [...old.attendance] : Array(daysInActiveMonth).fill('');

            // якщо створюємо таблицю для поточного дня — НЕ підставляємо тут, це робить авто-логіка
            if (!old && isSameMonth) {
                // залишаємо порожнім todayIndex — авто-аплай зробить свою роботу
                if (todayIndex >= 0 && todayIndex < attendance.length) {
                    // нічого
                }
            }

            // попередня підготовка exclusion ( лише стартовий індекс — нам цього досить )
            let exclusion: AttendanceRow['exclusion'] | undefined;
            const uExcluded = exclusionsByUserId.get(u.id);
            if (uExcluded) {
                exclusion = {
                    description: uExcluded.description,
                    periodFrom: uExcluded.periodFrom,
                    startIndex: uExcluded.startIndex,
                };
            }

            return {
                id: i + 1,
                rank: u.rank || '',
                shpkNumber: u.shpkNumber ?? '',
                fullName: u.fullName || '',
                attendance,
                exclusion,
            };
        });

        while (base.length % ROWS_PER_TABLE !== 0) {
            base.push({
                id: base.length + 1,
                rank: '',
                shpkNumber: '',
                fullName: '',
                attendance: Array(daysInActiveMonth).fill(''),
                exclusion: undefined,
            });
        }

        createTable(key, base);
        setActiveKey(key);
    };

    const applyTodayStatuses = async () => {
        const key = todayKey();
        const nl = useNamedListStore.getState();

        if (!nl.activeKey && nl.tables[key]) {
            setActiveKey(key);
        }
        const ak = useNamedListStore.getState().activeKey;
        if (!ak) {
            console.warn('🚫 applyTodayStatuses: немає activeKey');
            return;
        }
        if (ak !== key) {
            console.warn(`🚫 applyTodayStatuses: активна таблиця не за сьогодні (${ak} ≠ ${key})`);
            return;
        }

        const dayIndex = new Date().getDate() - 1;
        const rows = useNamedListStore.getState().tables[ak] || [];
        if (!rows.length) {
            console.warn('🚫 applyTodayStatuses: порожні рядки');
            return;
        }

        // було: Map по shpkNumber — видаляємо цей шматок

        // нове: просто використовуємо ім’я+звання для пошуку
        let appliedCount = 0;
        for (const row of rows) {
            const uKey = keyByNameRank(row.fullName, row.rank);
            const u = useUserStore
                .getState()
                .users.find((x) => keyByNameRank(x.fullName, x.rank) === uKey);
            if (!u) continue;

            const short = statusToShort[u.soldierStatus as StatusExcel] ?? '';
            if (!short) continue;

            if (!row.attendance[dayIndex]) {
                await nl.updateCell(key, row.id, dayIndex, short);
                appliedCount++;
            }
        }

        if (appliedCount > 0) {
            alert(`✅ Підставлено статусів: ${appliedCount}`);
        } else {
            console.log('ℹ️ applyTodayStatuses: нічого не підставлено — вже заповнено');
        }
    };

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
                                        {months[(m || 1) - 1]} {y}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {activeKey && (
                        <button
                            onClick={async () => {
                                if (
                                    !window.confirm(
                                        `Видалити таблицю ${activeKey}? Дію не можна скасувати.`,
                                    )
                                )
                                    return;
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

            {/* Таблиці по 14 рядків */}
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
                                    {group.map((row) => {
                                        // знаходимо користувача по shpkNumber (стабільний ключ)
                                        const matchedUser = usersByNameRank.get(
                                            keyByNameRank(row.fullName, row.rank),
                                        );

                                        // готове виключення по userId (якщо є)
                                        const exclusion = matchedUser
                                            ? exclusionsByUserId.get(matchedUser.id)
                                            : undefined;

                                        const cells: JSX.Element[] = [];
                                        for (let di = 0; di < daysInActiveMonth; di++) {
                                            if (exclusion && di === exclusion.startIndex) {
                                                const colSpan = daysInActiveMonth - di;
                                                cells.push(
                                                    <td
                                                        key={`excl-${di}`}
                                                        colSpan={colSpan}
                                                        className="border p-1 text-[11px] text-left align-top whitespace-pre-line"
                                                    >
                                                        {exclusion.description}{' '}
                                                        {exclusion.periodFrom}
                                                    </td>,
                                                );
                                                break;
                                            }
                                            if (exclusion && di > exclusion.startIndex) {
                                                continue;
                                            }

                                            cells.push(
                                                <AttendanceCell
                                                    key={di}
                                                    value={row.attendance[di]}
                                                    onChange={(val) =>
                                                        updateCell(activeKey!, row.id, di, val)
                                                    }
                                                />,
                                            );
                                        }

                                        return (
                                            <tr key={row.id} className="hover:bg-gray-50">
                                                <td className="border p-1">{row.id}</td>
                                                <td className="border p-1">{row.rank}</td>
                                                <td className="border p-1 text-left">
                                                    {row.fullName}
                                                </td>
                                                {cells}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
        </div>
    );
}

/** Окрема клітинка з локальним станом і дебаунсом збереження */
function AttendanceCell({
    value,
    onChange,
}: {
    value: string;
    onChange: (val: string) => void | Promise<void>;
}) {
    const [local, setLocal] = useState(value ?? '');
    useEffect(() => {
        // якщо змінюється значення в сторах (ззовні) — синхронізуємо
        setLocal(value ?? '');
    }, [value]);

    const debouncedSave = useDebouncedCallback((v: string) => {
        onChange(normToken(v));
    }, 180);

    return (
        <td className="border p-0.5">
            <input
                type="text"
                maxLength={3}
                value={local}
                onChange={(e) => {
                    const v = normToken(e.target.value);
                    setLocal(v);
                    debouncedSave(v);
                }}
                className="w-full text-center text-xs bg-transparent outline-none border-none"
            />
        </td>
    );
}
