import { useEffect, useMemo, useState } from 'react';

import { ShtatnaPosada, useShtatniStore } from '../entities/shtatna-posada/model/useShtatniStore';
import type { CommentOrHistoryEntry, User } from '../../types/user';
import EditPosadaModal from '../entities/shtatna-posada/ui/EditPosadaModal';
import ShtatniPosadyHeader from '../entities/shtatna-posada/ui/ShtatniPosadyHeader';
import ShtatniPosadyTable from '../entities/shtatna-posada/ui/ShtatniPosadyTable';
import { useUserStore } from '../stores/userStore';

export default function ShtatniPosadyTab() {
    const { shtatniPosady, loading, fetchAll, deletePosada, updatePosada, deleteAll } =
        useShtatniStore();

    const { users, fetchUsers, updateUser } = useUserStore();

    const [editing, setEditing] = useState<ShtatnaPosada | null>(null);
    const [form, setForm] = useState<Partial<ShtatnaPosada>>({});
    const [usersLoaded, setUsersLoaded] = useState(false);
    const [posadyLoaded, setPosadyLoaded] = useState(false);
    const [hasSyncedUsers, setHasSyncedUsers] = useState(false);

    const unassignUserFromPosada = async (pos: ShtatnaPosada) => {
        // ✅ знайти користувача, який зараз займає цю посаду (по shpkNumber)
        const assignedUser = users.find((u) => u.shpkNumber === pos.shtat_number);

        if (!assignedUser) {
            alert(
                `❗ На посаду "${pos.position_name}" (${pos.unit_name}) зараз ніхто не призначений`,
            );
            return;
        }

        // ✅ Запис в історію
        const historyEntry: CommentOrHistoryEntry = {
            id: Date.now(),
            date: new Date().toISOString(),
            type: 'history',
            author: 'System',
            description: `Користувача ${assignedUser.fullName} звільнено з посади ${pos.position_name} (${pos.unit_name})`,
            content: '',
            files: [],
        };

        // ✅ Очищуємо дані посади у користувача
        const clearedUser: User = {
            ...assignedUser,
            position: null,
            unitMain: null,
            shpkCode: null,
            shpkNumber: null, // ключове!
            category: null,
            shtatNumber: null,
            history: [...(assignedUser.history || []), historyEntry],
        };

        // ✅ Оновлюємо користувача в Zustand/БД
        await updateUser(clearedUser);

        // ✅ Якщо цей користувач зараз відкритий у правій панелі – оновлюємо стан
        const setSelectedUser = useUserStore.getState().setSelectedUser;
        if (useUserStore.getState().selectedUser?.id === assignedUser.id) {
            setSelectedUser(clearedUser);
        }

        alert(
            `✅ ${assignedUser.fullName} звільнений з посади "${pos.position_name}" (${pos.unit_name})`,
        );
    };
    const mergeUserAssignmentsOnce = async () => {
        const usersToFix: User[] = [];

        for (const u of users) {
            const pos = shtatniPosady.find((p) => String(p.shtat_number) === String(u.shpkNumber));
            if (!pos) continue;

            const needsUpdate =
                u.position !== pos.position_name ||
                u.unitMain !== pos.unit_name ||
                u.category !== pos.category ||
                u.shpkCode !== pos.shpk_code ||
                String(u.shpkNumber) !== String(pos.shtat_number) ||
                String(u.shtatNumber) !== String(pos.shtat_number);

            if (needsUpdate) {
                usersToFix.push({
                    ...u,
                    position: pos.position_name,
                    unitMain: pos.unit_name,
                    category: pos.category,
                    shpkCode: pos.shpk_code,
                    shpkNumber: pos.shtat_number,
                    shtatNumber: pos.shtat_number,
                });
            }
        }

        if (usersToFix.length) {
            await window.electronAPI.bulkUpdateUsers(usersToFix);

            // ✅ Refresh all users once after merge
            const fresh = await window.electronAPI.fetchUsersMetadata();
            useUserStore.setState({ users: fresh });
        }
    };

    useEffect(() => {
        let cancelled = false;

        fetchUsers().then(() => {
            if (!cancelled) setUsersLoaded(true);
        });
        fetchAll().then(() => {
            if (!cancelled) setPosadyLoaded(true);
        });

        return () => {
            // ✅ Reset state when component unmounts
            cancelled = true;
            setUsersLoaded(false);
            setPosadyLoaded(false);
        };
    }, []);

    useEffect(() => {
        if (!usersLoaded || !posadyLoaded || hasSyncedUsers) return;

        mergeUserAssignmentsOnce().then(() => setHasSyncedUsers(true));
    }, [usersLoaded, posadyLoaded, hasSyncedUsers]);

    const assignUserToPosada = async (userId: number, pos: ShtatnaPosada) => {
        const selectedUser = users.find((u) => u.id === userId);
        if (!selectedUser) return;

        const newPosReadable = `${pos.position_name} (${pos.unit_name})`;
        const oldPosReadable = selectedUser.position
            ? `${selectedUser.position} (${selectedUser.unitMain})`
            : null;

        const setSelectedUser = useUserStore.getState().setSelectedUser;

        // ========= 1️⃣ CLEAR USER WHO CURRENTLY HOLDS THIS POSADA =========
        const alreadyOnThisPosada = users.find((u) => u.shtatNumber === pos.shtat_number);

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
            <ShtatniPosadyHeader total={shtatniPosady.length} onDeleteAll={handleDeleteAll} />

            {loading && <p className="text-gray-500">Завантаження...</p>}

            {editing && (
                <EditPosadaModal
                    form={form}
                    setForm={setForm}
                    onClose={() => setEditing(null)}
                    onSave={handleSave}
                />
            )}

            {/* ✅ Compact Table with Assign column */}
            <ShtatniPosadyTable
                groupedWithHeaders={groupedWithHeaders}
                users={users}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAssign={assignUserToPosada}
                onUnassign={unassignUserFromPosada}
            />
        </div>
    );
}
