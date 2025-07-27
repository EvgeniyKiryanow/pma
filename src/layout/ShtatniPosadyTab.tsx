import { useEffect, useState, useMemo } from 'react';
import { useShtatniStore, ShtatnaPosada } from '../stores/useShtatniStore';
import { useUserStore } from '../stores/userStore';
import type { CommentOrHistoryEntry, User } from '../types/user';

import {
    getUnitBadge,
    getPositionBadge,
    getCategoryBadge,
    getShpkBadge,
} from '../utils/posadyBadgeHelper';
import { Pencil, Trash2 } from 'lucide-react';

export default function ShtatniPosadyTab() {
    const { shtatniPosady, loading, fetchAll, deletePosada, updatePosada, deleteAll } =
        useShtatniStore();

    const { users, fetchUsers, updateUser } = useUserStore();

    const [editing, setEditing] = useState<ShtatnaPosada | null>(null);
    const [form, setForm] = useState<Partial<ShtatnaPosada>>({});
    const unassignUserFromPosada = async (pos: ShtatnaPosada) => {
        // знайти користувача, який зараз займає цю посаду
        const assignedUser = users.find(
            (u) =>
                u.shtatNumber === pos.shtat_number ||
                (u.position === pos.position_name && u.unitMain === pos.unit_name),
        );

        if (!assignedUser) {
            alert('❗ На цю посаду зараз ніхто не призначений');
            return;
        }

        const historyEntry: CommentOrHistoryEntry = {
            id: Date.now(),
            date: new Date().toISOString(),
            type: 'history',
            author: 'System',
            description: `Користувача ${assignedUser.fullName} звільнено з посади ${pos.position_name} (${pos.unit_name})`,
            content: '',
            files: [],
        };

        const clearedUser: User = {
            ...assignedUser,
            position: null,
            unitMain: null,
            shpkCode: null,
            shpkNumber: null,
            category: null,
            shtatNumber: null,
            history: [...(assignedUser.history || []), historyEntry],
        };

        await updateUser(clearedUser);

        // якщо цей користувач зараз відкритий у правій панелі – оновлюємо стан
        const setSelectedUser = useUserStore.getState().setSelectedUser;
        if (useUserStore.getState().selectedUser?.id === assignedUser.id) {
            setSelectedUser(clearedUser);
        }

        alert(`✅ ${assignedUser.fullName} звільнений з посади "${pos.position_name}"`);
    };

    useEffect(() => {
        // ✅ Fetch both posady & users when page loads
        fetchAll();
        fetchUsers();
    }, []);

    const assignUserToPosada = async (userId: number, pos: ShtatnaPosada) => {
        const selectedUser = users.find((u) => u.id === userId);
        if (!selectedUser) return;

        const newPosReadable = `${pos.position_name} (${pos.unit_name})`;
        const oldPosReadable = selectedUser.position
            ? `${selectedUser.position} (${selectedUser.unitMain})`
            : null;

        const setSelectedUser = useUserStore.getState().setSelectedUser;

        // ========= 1️⃣ CLEAR USER WHO CURRENTLY HOLDS THIS POSADA =========
        const alreadyOnThisPosada = users.find(
            (u) =>
                u.shtatNumber === pos.shtat_number ||
                (u.position === pos.position_name && u.unitMain === pos.unit_name),
        );

        if (alreadyOnThisPosada) {
            const clearedHistory: CommentOrHistoryEntry = {
                id: Date.now(),
                date: new Date().toISOString(),
                type: 'history',
                author: 'System',
                description: `Користувача ${alreadyOnThisPosada.fullName} звільнено з посади ${pos.position_name} (${pos.unit_name})`,
                content: '',
                files: [],
            };

            const clearedUser: User = {
                ...alreadyOnThisPosada,
                position: null,
                unitMain: null,
                shpkCode: null,
                shpkNumber: null,
                category: null,
                shtatNumber: null,
                history: [...(alreadyOnThisPosada.history || []), clearedHistory],
            };

            await updateUser(clearedUser);

            // refresh if currently selected
            if (useUserStore.getState().selectedUser?.id === alreadyOnThisPosada.id) {
                setSelectedUser(clearedUser);
            }
        }

        // ========= 2️⃣ BUILD HISTORY ENTRY FOR MOVEMENT/ASSIGNMENT =========
        let newHistory: CommentOrHistoryEntry;
        if (selectedUser.shtatNumber) {
            // User already has another posada → movement
            newHistory = {
                id: Date.now(),
                date: new Date().toISOString(),
                type: 'history',
                author: 'System',
                description: `Переміщено з посади ${oldPosReadable} → ${newPosReadable}`,
                content: '',
                files: [],
            };
        } else {
            // User had no posada → first assignment
            newHistory = {
                id: Date.now(),
                date: new Date().toISOString(),
                type: 'history',
                author: 'System',
                description: `Призначено на посаду ${newPosReadable}`,
                content: '',
                files: [],
            };
        }

        // ========= 3️⃣ FINAL UPDATED USER =========
        const updatedUser: User = {
            ...selectedUser,
            position: pos.position_name,
            unitMain: pos.unit_name,
            shpkCode: pos.shpk_code,
            shpkNumber: pos.shtat_number,
            category: pos.category,
            shtatNumber: pos.shtat_number,
            history: [...(selectedUser.history || []), newHistory],
        };

        // ✅ Single update call → saves BOTH position + history
        await updateUser(updatedUser);

        // ✅ Refresh right panel
        setSelectedUser(updatedUser);

        alert(
            `✅ ${selectedUser.fullName} призначений на "${pos.position_name}" (${pos.unit_name})`,
        );
    };

    const handleDelete = async (shtat_number: string) => {
        if (confirm('Видалити цю посаду?')) {
            await deletePosada(shtat_number);
        }
    };

    const handleEdit = (pos: ShtatnaPosada) => {
        setEditing(pos);
        setForm(pos);
    };

    const handleSave = async () => {
        if (!editing) return;
        const updated: ShtatnaPosada = { ...editing, ...form };
        const ok = await updatePosada(updated);
        if (ok) {
            setEditing(null);
            setForm({});
        }
    };

    const handleDeleteAll = async () => {
        if (confirm('❗ Ви впевнені, що хочете видалити ВСІ штатні посади?')) {
            await deleteAll();
        }
    };

    /** ✅ Sort posady by shtat_number numeric */
    const sortedPosady = useMemo(() => {
        return [...shtatniPosady].sort((a, b) => {
            const numA = parseInt(a.shtat_number.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.shtat_number.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        });
    }, [shtatniPosady]);

    /** ✅ Auto-group by unit headers */
    const groupedWithHeaders = useMemo(() => {
        const result: Array<{ type: 'header' | 'pos'; data: string | ShtatnaPosada }> = [];
        let lastHeader = '';

        sortedPosady.forEach((pos) => {
            const unitName = (pos.unit_name || '').trim();

            if (
                unitName.toLowerCase().includes('управління роти') ||
                unitName.toLowerCase().includes('взвод') ||
                unitName.toLowerCase().includes('відділення')
            ) {
                if (unitName !== lastHeader) {
                    result.push({ type: 'header', data: unitName });
                    lastHeader = unitName;
                }
            }

            result.push({ type: 'pos', data: pos });
        });

        return result;
    }, [sortedPosady]);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">📋 Штатні посади</h2>
                {shtatniPosady.length > 0 && (
                    <button
                        className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
                        onClick={handleDeleteAll}
                    >
                        ❌ Видалити всі
                    </button>
                )}
            </div>

            {loading && <p className="text-gray-500">Завантаження...</p>}

            {/* Edit Modal */}
            {editing && (
                <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded shadow-lg w-[400px]">
                        <h3 className="text-lg font-semibold mb-4">Редагувати посаду</h3>

                        <div className="space-y-3">
                            <label className="block text-sm">
                                Підрозділ
                                <input
                                    className="w-full mt-1 border rounded p-2"
                                    value={form.unit_name ?? ''}
                                    onChange={(e) =>
                                        setForm({ ...form, unit_name: e.target.value })
                                    }
                                />
                            </label>
                            <label className="block text-sm">
                                Посада
                                <input
                                    className="w-full mt-1 border rounded p-2"
                                    value={form.position_name ?? ''}
                                    onChange={(e) =>
                                        setForm({ ...form, position_name: e.target.value })
                                    }
                                />
                            </label>
                            <label className="block text-sm">
                                Категорія
                                <input
                                    className="w-full mt-1 border rounded p-2"
                                    value={form.category ?? ''}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                />
                            </label>
                            <label className="block text-sm">
                                ШПК
                                <input
                                    className="w-full mt-1 border rounded p-2"
                                    value={form.shpk_code ?? ''}
                                    onChange={(e) =>
                                        setForm({ ...form, shpk_code: e.target.value })
                                    }
                                />
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                                onClick={() => setEditing(null)}
                            >
                                Скасувати
                            </button>
                            <button
                                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                                onClick={handleSave}
                            >
                                Зберегти
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ Compact Table with Assign column */}
            <div className="overflow-x-auto border rounded shadow bg-white">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100 text-gray-700">
                        <tr>
                            <th className="border px-2 py-1 text-left w-20">№</th>
                            <th className="border px-2 py-1 text-left">Підрозділ</th>
                            <th className="border px-2 py-1 text-left">Посада</th>
                            <th className="border px-2 py-1 text-left">Кат</th>
                            <th className="border px-2 py-1 text-left">ШПК</th>
                            {/* ✅ New column */}
                            <th className="border px-2 py-1 text-left">Призначений користувач</th>
                            <th className="border px-2 py-1 text-center w-20">Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedWithHeaders.map((item, idx) => {
                            if (item.type === 'header') {
                                const headerText = item.data as string;
                                return (
                                    <tr key={`header-${idx}`} className="bg-green-100">
                                        <td
                                            colSpan={7}
                                            className="px-3 py-1 font-semibold text-green-800 text-left"
                                        >
                                            {headerText}
                                        </td>
                                    </tr>
                                );
                            }

                            const pos = item.data as ShtatnaPosada;
                            const unit = getUnitBadge(pos.unit_name);
                            const position = getPositionBadge(pos.position_name);
                            const category = getCategoryBadge(pos.category);
                            const shpk = getShpkBadge(pos.shpk_code);

                            // Find already assigned user if exists
                            const matchedUser = users.find(
                                (u) =>
                                    u.position === pos.position_name &&
                                    u.unitMain === pos.unit_name,
                            );

                            return (
                                <tr key={pos.shtat_number} className="hover:bg-gray-50 transition">
                                    {/* № */}
                                    <td className="border px-2 py-1 font-medium text-gray-800">
                                        {pos.shtat_number}
                                    </td>

                                    {/* Unit */}
                                    <td className="border px-2 py-1">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${unit.badgeStyle}`}
                                        >
                                            {unit.icon} {pos.unit_name || '-'}
                                        </span>
                                    </td>

                                    {/* Position */}
                                    <td className="border px-2 py-1">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${position.badgeStyle}`}
                                        >
                                            {position.icon} {pos.position_name || '-'}
                                        </span>
                                    </td>

                                    {/* Category */}
                                    <td className="border px-2 py-1">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${category.badgeStyle}`}
                                        >
                                            {category.icon} {pos.category || '-'}
                                        </span>
                                    </td>

                                    {/* ШПК */}
                                    <td className="border px-2 py-1">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${shpk.badgeStyle}`}
                                        >
                                            {shpk.icon} {pos.shpk_code || '-'}
                                        </span>
                                    </td>

                                    {/* ✅ New column: assign/select user */}
                                    <td className="border px-2 py-1">
                                        <select
                                            className="text-xs border rounded px-1 py-0.5 max-w-[180px]"
                                            value={
                                                // ✅ find user who is assigned to this posada by shtatNumber
                                                users.find((u) => u.shpkNumber === pos.shtat_number)
                                                    ?.id || ''
                                            }
                                            onChange={(e) => {
                                                const selectedValue = e.target.value;

                                                if (selectedValue === 'remove') {
                                                    // користувач вибрав "Зняти"
                                                    unassignUserFromPosada(pos);
                                                    return;
                                                }

                                                const userId = Number(selectedValue);
                                                if (userId) assignUserToPosada(userId, pos);
                                            }}
                                        >
                                            {/* перша опція */}
                                            <option value="">-- Обрати користувача --</option>

                                            {/* опція для зняття */}
                                            <option value="remove">✖ Зняти користувача</option>

                                            {/* ✅ Список усіх користувачів */}
                                            {users.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {u.fullName}{' '}
                                                    {u.shtatNumber === pos.shtat_number
                                                        ? '✅ (призначений)'
                                                        : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* Actions */}
                                    <td className="border px-2 py-1 text-center">
                                        <button
                                            onClick={() => handleEdit(pos)}
                                            className="p-1 rounded bg-yellow-200 hover:bg-yellow-300"
                                        >
                                            <Pencil className="w-4 h-4 text-yellow-800" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(pos.shtat_number)}
                                            className="p-1 ml-1 rounded bg-red-500 hover:bg-red-600 text-white"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}

                        {shtatniPosady.length === 0 && !loading && (
                            <tr>
                                <td colSpan={7} className="text-center p-4 text-gray-500 italic">
                                    Немає жодної посади
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
