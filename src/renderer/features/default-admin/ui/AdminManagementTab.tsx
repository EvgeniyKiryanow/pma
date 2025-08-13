// src/pages/admin/ui/AdminManagementTab.tsx
import { useEffect, useMemo, useState } from 'react';

import * as api from '../model/api';
import type { FullUser, NewUserState } from '../model/types';
import CreateUserForm from './components/CreateUserForm';
import RolesPanel from './components/RolesPanel';
import { Toast } from './components/Toast';
import UserList from './components/UserList';
import UsersToolbar from './components/UsersToolbar';

type Role = { id: number; name: string; description?: string; allowed_tabs?: string[] };

export default function AdminManagementTab() {
    const [users, setUsers] = useState<FullUser[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [generatingId, setGeneratingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [newUser, setNewUser] = useState<NewUserState>({
        username: '',
        password: '',
        recovery_hint: '',
        role: 'user',
    });

    const [q, setQ] = useState('');
    const [sortAsc, setSortAsc] = useState(true);

    // -------- helpers (toasts) ----------
    const toast = (t: string) => {
        setMessage(t);
        setTimeout(() => setMessage(null), 3000);
    };
    const toastErr = (t: string) => {
        setError(t);
        setTimeout(() => setError(null), 4000);
    };

    // -------- load roles/users ----------
    const loadRoles = async () => {
        try {
            const list = await api.fetchRoles();
            setRoles(list as Role[]);
        } catch {
            toastErr('Не вдалося завантажити ролі');
        }
    };

    const loadUsers = async () => {
        try {
            setLoading(true);
            const list = await api.fetchAll();
            setUsers(list);
        } catch {
            toastErr('Не вдалося завантажити користувачів');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        (async () => {
            await Promise.all([loadRoles(), loadUsers()]);
        })();
    }, []);

    // Після завантаження ролей ставимо роль за замовчуванням ("user"), якщо ще не вибрана
    useEffect(() => {
        if (roles.length && selectedRoleId == null) {
            const def = roles.find((r) => r.name === 'user') || roles[0];
            if (def) setSelectedRoleId(def.id);
        }
    }, [roles, selectedRoleId]);

    // -------- memos ----------
    const adminUsers = useMemo(() => users.filter((u) => u.source === 'default_admin'), [users]);
    const regularUsersRaw = useMemo(() => users.filter((u) => u.source === 'auth_user'), [users]);

    const regularUsers = useMemo(() => {
        let list = regularUsersRaw;
        if (q.trim()) {
            const qq = q.trim().toLowerCase();
            list = list.filter((u) => u.username.toLowerCase().includes(qq));
        }
        list = [...list].sort((a, b) =>
            sortAsc ? a.username.localeCompare(b.username) : b.username.localeCompare(a.username),
        );
        return list;
    }, [regularUsersRaw, q, sortAsc]);

    // -------- actions ----------
    const handleCreateUser = async () => {
        const uname = newUser.username.trim().toLowerCase();
        if (!uname || !newUser.password) {
            toastErr('❗ Введіть логін і пароль');
            return;
        }

        try {
            const ok = await api.createUser({ ...newUser, username: uname });
            if (!ok) {
                toastErr('Користувач існує або сталася помилка під час реєстрації');
                return;
            }

            // Призначаємо вибрану роль новому користувачу (якщо обрана)
            if (selectedRoleId) {
                try {
                    const authUsers = await window.electronAPI.getAuthUsers();
                    const justCreated = (authUsers || []).find((u: any) => u.username === uname);
                    if (justCreated?.id) {
                        const res = await api.setUserRole(justCreated.id, selectedRoleId);
                        if (!res?.success) {
                            toastErr(
                                res?.message ||
                                    'Роль створено, але не вдалося призначити користувачу',
                            );
                        }
                    } else {
                        toastErr('Користувача створено, але його не знайдено для призначення ролі');
                    }
                } catch {
                    toastErr('Не вдалося призначити роль новому користувачу');
                }
            }

            toast('✅ Користувача створено');
            setNewUser({ username: '', password: '', recovery_hint: '', role: 'user' });
            await loadUsers();
        } catch {
            toastErr('Помилка при створенні користувача');
        }
    };

    const handleSave = async (user: FullUser) => {
        setSavingId(user.id);
        try {
            const ok = await api.saveUser(user);
            if (!ok) {
                toastErr('Не вдалося зберегти зміни');
            } else {
                toast('Зміни збережено');
                await loadUsers();
            }
        } catch {
            toastErr('Помилка при збереженні');
        } finally {
            setSavingId(null);
        }
    };

    const handleGenerateKey = async (user: FullUser) => {
        if (user.source !== 'auth_user') return;
        setGeneratingId(user.id);
        try {
            const res = await api.generateKey(user.id);
            if (res?.success && res.key) {
                setUsers((prev) =>
                    prev.map((u) =>
                        u.id === user.id && u.source === 'auth_user' ? { ...u, key: res.key! } : u,
                    ),
                );
                toast('🔑 Ключ оновлено');
            } else {
                toastErr('Не вдалося згенерувати ключ');
            }
        } catch {
            toastErr('Помилка при генерації ключа');
        } finally {
            setGeneratingId(null);
        }
    };

    const handleDelete = async (user: FullUser) => {
        if (user.source !== 'auth_user') return;
        if (!confirm(`Видалити користувача «${user.username}»? Дію не можна скасувати.`)) return;
        setDeletingId(user.id);
        try {
            const ok = await api.deleteUser(user.id);
            if (!ok) {
                toastErr('Не вдалося видалити користувача');
            } else {
                toast('🗑️ Користувача видалено');
                setUsers((prev) =>
                    prev.filter((u) => !(u.id === user.id && u.source === 'auth_user')),
                );
            }
        } catch {
            toastErr('Помилка при видаленні');
        } finally {
            setDeletingId(null);
        }
    };

    const onChangeUser = (
        id: number,
        source: FullUser['source'],
        updater: (u: FullUser) => FullUser,
    ) => {
        setUsers((prev) => prev.map((u) => (u.id === id && u.source === source ? updater(u) : u)));
    };

    // -------- render ----------
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                        Управління користувачами
                    </h2>
                    <p className="text-sm text-gray-500">
                        Створюйте користувачів, призначайте ролі та керуйте доступами до вкладок
                    </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {users.length} користувач(ів)
                </span>
            </div>

            <RolesPanel />

            {message && <Toast kind="ok" text={message} />}
            {error && <Toast kind="err" text={error} />}

            <CreateUserForm
                state={newUser}
                setState={setNewUser}
                onCreate={handleCreateUser}
                // 👇 додаємо селектор ролей у формі створення
                roles={roles}
                selectedRoleId={selectedRoleId}
                setSelectedRoleId={setSelectedRoleId}
            />

            <UsersToolbar q={q} setQ={setQ} sortAsc={sortAsc} setSortAsc={setSortAsc} />

            <section className="space-y-6">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                            >
                                <div className="animate-pulse space-y-3">
                                    <div className="h-4 bg-slate-200 rounded w-1/5" />
                                    <div className="h-8 bg-slate-200 rounded w-2/3" />
                                    <div className="h-5 bg-slate-200 rounded w-full" />
                                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                                    <div className="h-5 bg-slate-200 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <UserList
                        roles={roles}
                        admins={adminUsers}
                        users={regularUsers}
                        savingId={savingId}
                        generatingId={generatingId}
                        deletingId={deletingId}
                        onChangeUser={onChangeUser}
                        onSaveUser={handleSave}
                        onGenerateKey={handleGenerateKey}
                        onDeleteUser={handleDelete}
                    />
                )}
            </section>
        </div>
    );
}
