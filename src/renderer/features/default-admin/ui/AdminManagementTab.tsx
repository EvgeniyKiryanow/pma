import { useEffect, useMemo, useState } from 'react';

import * as api from '../model/api';
import type { FullUser, NewUserState } from '../model/types';
import CreateUserForm from './components/CreateUserForm';
import { Toast } from './components/Toast';
import UserList from './components/UserList';
import UsersToolbar from './components/UsersToolbar';

export default function AdminManagementTab() {
    const [users, setUsers] = useState<FullUser[]>([]);
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

    const toast = (t: string) => {
        setMessage(t);
        setTimeout(() => setMessage(null), 3000);
    };
    const toastErr = (t: string) => {
        setError(t);
        setTimeout(() => setError(null), 4000);
    };

    const load = async () => {
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
        load();
    }, []);

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

    const handleCreateUser = async () => {
        const uname = newUser.username.trim().toLowerCase();
        if (!uname || !newUser.password) {
            toastErr('❗ Введіть логін і пароль');
            return;
        }
        try {
            const ok = await api.createUser({ ...newUser, username: uname });
            if (!ok) return toastErr('Користувач існує або помилка реєстрації');
            toast('✅ Користувача створено');
            setNewUser({ username: '', password: '', recovery_hint: '', role: 'user' });
            load();
        } catch {
            toastErr('Помилка при створенні користувача');
        }
    };

    const handleSave = async (user: FullUser) => {
        setSavingId(user.id);
        try {
            const ok = await api.saveUser(user);
            if (!ok) return toastErr('Не вдалося зберегти зміни');
            toast('Зміни збережено');
            load();
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
        if (!confirm(`Видалити користувача "${user.username}"? Цю дію не можна скасувати.`)) return;
        setDeletingId(user.id);
        try {
            const ok = await api.deleteUser(user.id);
            if (!ok) return toastErr('Не вдалося видалити користувача');
            toast('🗑️ Користувача видалено');
            setUsers((prev) => prev.filter((u) => !(u.id === user.id && u.source === 'auth_user')));
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

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                        Управління користувачами
                    </h2>
                    <p className="text-sm text-gray-500">
                        Створюйте, змінюйте ролі, керуйте доступами
                    </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {users.length} користувач(ів)
                </span>
            </div>

            {message && <Toast kind="ok" text={message} />}
            {error && <Toast kind="err" text={error} />}

            <CreateUserForm state={newUser} setState={setNewUser} onCreate={handleCreateUser} />

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
