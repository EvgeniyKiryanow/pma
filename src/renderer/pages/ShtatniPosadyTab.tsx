import { ListTree } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { CommentOrHistoryEntry, User } from '../../shared/types/user';
import { ShtatnaPosada, useShtatniStore } from '../entities/shtatna-posada/model/useShtatniStore';
import EditPosadaModal from '../entities/shtatna-posada/ui/EditPosadaModal';
import ShtatniPosadyHeader from '../entities/shtatna-posada/ui/ShtatniPosadyHeader';
import ShtatniPosadyTable from '../entities/shtatna-posada/ui/ShtatniPosadyTable';
import { EmptyState, Spinner } from '../shared/ui';
import { confirmAction } from '../shared/ui/confirm';
import { toast } from '../shared/ui/toast';
import { usePermissions } from '../stores/sessionStore';
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
    const [query, setQuery] = useState('');
    const { can } = usePermissions();
    const canEditStaffing = can('staffing.edit');

    const unassignUserFromPosada = async (pos: ShtatnaPosada) => {
        // ✅ знайти користувача, який зараз займає цю посаду (по shpkNumber)
        const assignedUser = users.find((u) => u.shpkNumber === pos.shtat_number);

        if (!assignedUser) {
            toast.info(
                `На посаду «${pos.position_name}» (${pos.unit_name}) зараз ніхто не призначений`,
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
        };

        // ✅ Оновлюємо користувача в Zustand/БД
        await window.electronAPI.addUserHistory(assignedUser.id, historyEntry);
        await updateUser(clearedUser);

        // ✅ Якщо цей користувач зараз відкритий у правій панелі – оновлюємо стан
        const setSelectedUser = useUserStore.getState().setSelectedUser;
        if (useUserStore.getState().selectedUser?.id === assignedUser.id) {
            setSelectedUser(clearedUser);
        }

        toast.success(
            `${assignedUser.fullName} знято з посади «${pos.position_name}» (${pos.unit_name})`,
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
                String(u.shpkNumber) !== String(pos.shtat_number);

            if (needsUpdate) {
                usersToFix.push({
                    ...u,
                    position: pos.position_name,
                    unitMain: pos.unit_name,
                    category: pos.category,
                    shpkCode: pos.shpk_code,
                    shpkNumber: pos.shtat_number,
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

        fetchUsers()
            .then((): null => {
                if (!cancelled) {
                    setUsersLoaded(true);
                }
                return null;
            })
            .catch((err) => {
                console.error('Error fetching users:', err);
            });
        fetchAll()
            .then(() => {
                if (!cancelled) {
                    setPosadyLoaded(true);
                }
                return null;
            })
            .catch((err) => {
                console.error('Error fetching posady:', err);
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

        mergeUserAssignmentsOnce()
            .then(() => setHasSyncedUsers(true))
            .catch((err) => {
                console.error('Error merging user assignments:', err);
            });
    }, [usersLoaded, posadyLoaded, hasSyncedUsers, mergeUserAssignmentsOnce]);

    const assignUserToPosada = async (userId: number, pos: ShtatnaPosada) => {
        const selectedUser = users.find((u) => u.id === userId);
        if (!selectedUser) return;

        const newPosReadable = `${pos.position_name} (${pos.unit_name})`;
        const oldPosReadable = selectedUser.position
            ? `${selectedUser.position} (${selectedUser.unitMain})`
            : null;

        const setSelectedUser = useUserStore.getState().setSelectedUser;

        // ========= 1️⃣ CLEAR USER WHO CURRENTLY HOLDS THIS POSADA =========
        // The holder is found by shpkNumber: it is the field stored in the database.
        const alreadyOnThisPosada = users.find(
            (u) => u.id !== userId && String(u.shpkNumber ?? '') === String(pos.shtat_number),
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
            };

            await window.electronAPI.addUserHistory(alreadyOnThisPosada.id, clearedHistory);
            await updateUser(clearedUser);

            // refresh if currently selected
            if (useUserStore.getState().selectedUser?.id === alreadyOnThisPosada.id) {
                setSelectedUser(clearedUser);
            }
        }

        // ========= 2️⃣ BUILD HISTORY ENTRY FOR MOVEMENT/ASSIGNMENT =========
        let newHistory: CommentOrHistoryEntry;
        if (selectedUser.shpkNumber && selectedUser.shpkNumber !== pos.shtat_number) {
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
        };
        await window.electronAPI.addUserHistory(selectedUser.id, newHistory);
        await updateUser(updatedUser);

        // ✅ Refresh right panel
        setSelectedUser(updatedUser);

        toast.success(
            `${selectedUser.fullName} призначений на «${pos.position_name}» (${pos.unit_name})`,
        );
    };

    const handleDelete = async (shtat_number: string) => {
        const confirmed = await confirmAction({
            title: 'Видалити посаду?',
            message: `Посаду № ${shtat_number} буде видалено з БЧС.`,
            confirmLabel: 'Видалити',
            tone: 'danger',
        });
        if (confirmed) await deletePosada(shtat_number);
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
        const confirmed = await confirmAction({
            title: 'Видалити всі штатні посади?',
            message: 'БЧС буде повністю очищено. Цю дію не можна скасувати.',
            confirmLabel: 'Видалити всі',
            tone: 'danger',
        });
        if (confirmed) await deleteAll();
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

    /** Search keeps a unit header only when some of its positions match. */
    const visibleGroups = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return groupedWithHeaders;
        const holderById = new Map(users.map((u) => [String(u.shpkNumber ?? ''), u.fullName]));
        const result: typeof groupedWithHeaders = [];
        let pendingHeader: (typeof groupedWithHeaders)[number] | null = null;
        for (const item of groupedWithHeaders) {
            if (item.type === 'header') {
                pendingHeader = item;
                continue;
            }
            const pos = item.data as ShtatnaPosada;
            const haystack = [
                pos.shtat_number,
                pos.unit_name,
                pos.position_name,
                pos.category,
                pos.shpk_code,
                holderById.get(String(pos.shtat_number)),
            ]
                .join(' ')
                .toLowerCase();
            if (!haystack.includes(q)) continue;
            if (pendingHeader) {
                result.push(pendingHeader);
                pendingHeader = null;
            }
            result.push(item);
        }
        return result;
    }, [groupedWithHeaders, query, users]);

    const assignedCount = useMemo(() => {
        const numbers = new Set(users.map((u) => String(u.shpkNumber ?? '')));
        return shtatniPosady.filter((p) => numbers.has(String(p.shtat_number))).length;
    }, [users, shtatniPosady]);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <ShtatniPosadyHeader
                total={shtatniPosady.length}
                assigned={assignedCount}
                query={query}
                onQueryChange={setQuery}
                onDeleteAll={canEditStaffing ? () => void handleDeleteAll() : undefined}
            />

            {editing && (
                <EditPosadaModal
                    form={form}
                    setForm={setForm}
                    onClose={() => setEditing(null)}
                    onSave={handleSave}
                />
            )}

            <div className="min-h-0 flex-1 p-5">
                {loading && shtatniPosady.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <Spinner />
                    </div>
                ) : visibleGroups.length === 0 ? (
                    <div className="card">
                        <EmptyState
                            icon={<ListTree />}
                            title={query ? 'Нічого не знайдено' : 'Штатних посад ще немає'}
                            description={
                                query
                                    ? 'Спробуйте інший запит.'
                                    : 'Імпортуйте БЧС з Excel у розділі «Таблиці та Excel».'
                            }
                        />
                    </div>
                ) : (
                    <ShtatniPosadyTable
                        groupedWithHeaders={visibleGroups}
                        users={users}
                        onEdit={handleEdit}
                        onDelete={(shtatNumber) => void handleDelete(shtatNumber)}
                        onAssign={assignUserToPosada}
                        onUnassign={unassignUserFromPosada}
                    />
                )}
            </div>
        </div>
    );
}
