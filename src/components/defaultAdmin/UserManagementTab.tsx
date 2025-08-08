import { useEffect, useMemo, useState } from 'react';

type SourceType = 'default_admin' | 'auth_user';
type Role = 'user' | 'admin' | 'default_admin';

type FullUser = {
    id: number;
    username: string;
    password?: string;
    recovery_hint: string | null;
    key: string;
    role: Role;
    source: SourceType;
};

type NewUserState = {
    username: string;
    password: string;
    recovery_hint: string;
    role: 'user' | 'admin';
};

function cls(...a: (string | false | null | undefined)[]) {
    return a.filter(Boolean).join(' ');
}

function scorePassword(pw: string) {
    let score = 0;
    if (!pw) return 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score, 5);
}

export default function UserManagementTab() {
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

    const fetchAllUsers = async () => {
        try {
            setLoading(true);
            const authUsers = await window.electronAPI.getAuthUsers();
            const defaultAdmin = await window.electronAPI.getDefaultAdmin();

            const formattedAuthUsers: FullUser[] = (authUsers || []).map((u: any) => ({
                id: u.id,
                username: u.username,
                recovery_hint: u.recovery_hint || null,
                key: u.key || '',
                role: (u.role === 'admin' ? 'admin' : 'user') as Role,
                source: 'auth_user',
            }));

            const adminUser: FullUser[] = defaultAdmin
                ? [
                      {
                          id: defaultAdmin.id,
                          username: defaultAdmin.username,
                          recovery_hint: defaultAdmin.recovery_hint || null,
                          key: defaultAdmin.key || '',
                          role: 'default_admin',
                          source: 'default_admin',
                      },
                  ]
                : [];

            setUsers([...adminUser, ...formattedAuthUsers]);
        } catch {
            toastErr('Не вдалося завантажити користувачів');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllUsers();
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
            const ok = await window.electronAPI.register(
                uname,
                newUser.password,
                newUser.recovery_hint || '',
            );
            if (!ok) {
                toastErr('Користувач існує або помилка реєстрації');
                return;
            }
            toast('✅ Користувача створено');
            setNewUser({ username: '', password: '', recovery_hint: '', role: 'user' });
            fetchAllUsers();
        } catch {
            toastErr('Помилка при створенні користувача');
        }
    };

    const handleSave = async (user: FullUser) => {
        setSavingId(user.id);
        try {
            const update: any = {
                username: String(user.username || '')
                    .trim()
                    .toLowerCase(),
                recovery_hint: user.recovery_hint ?? '',
            };
            if (user.source === 'auth_user') {
                if (user.role !== 'user' && user.role !== 'admin') {
                    toastErr('Некоректна роль');
                    return;
                }
                update.role = user.role;
            }
            if (user.password && user.password.length < 50) {
                update.password = user.password;
            }

            const ok =
                user.source === 'default_admin'
                    ? await window.electronAPI.updateDefaultAdmin(update)
                    : await window.electronAPI.updateAuthUser(user.id, update);

            if (!ok) {
                toastErr('Не вдалося зберегти зміни');
                return;
            }
            toast('Зміни збережено');
            fetchAllUsers();
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
            const res = await window.electronAPI.generateKeyForUser(user.id);
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
            const ok = await window.electronAPI.deleteAuthUser(user.id);
            if (!ok) {
                toastErr('Не вдалося видалити користувача');
                return;
            }
            toast('🗑️ Користувача видалено');
            setUsers((prev) => prev.filter((u) => !(u.id === user.id && u.source === 'auth_user')));
        } catch {
            toastErr('Помилка при видаленні');
        } finally {
            setDeletingId(null);
        }
    };

    const pwScore = scorePassword(newUser.password);

    return (
        <div className="space-y-6">
            {/* Header */}
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

            {/* Toasts */}
            {message && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg shadow-sm">
                    {message}
                </div>
            )}
            {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg shadow-sm">
                    {error}
                </div>
            )}

            {/* Create */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">Створити користувача</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                            Username
                        </label>
                        <input
                            className="w-full border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg px-3 py-2 text-sm outline-none transition"
                            value={newUser.username}
                            placeholder="j.doe"
                            onChange={(e) =>
                                setNewUser((prev) => ({ ...prev, username: e.target.value }))
                            }
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                            Password
                        </label>
                        <input
                            type="password"
                            className="w-full border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg px-3 py-2 text-sm outline-none transition"
                            value={newUser.password}
                            placeholder="••••••••"
                            onChange={(e) =>
                                setNewUser((prev) => ({ ...prev, password: e.target.value }))
                            }
                        />
                        {/* Strength bar */}
                        <div className="mt-2 h-2 w-full bg-slate-100 rounded">
                            <div
                                className={cls(
                                    'h-2 rounded transition-all',
                                    pwScore <= 2
                                        ? 'bg-rose-400'
                                        : pwScore <= 3
                                          ? 'bg-amber-400'
                                          : 'bg-emerald-500',
                                )}
                                style={{ width: `${(pwScore / 5) * 100}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Рекомендовано 12+ символів, великі/малі, цифри, спецсимволи
                        </p>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                            Recovery Hint
                        </label>
                        <input
                            className="w-full border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg px-3 py-2 text-sm outline-none transition"
                            value={newUser.recovery_hint}
                            placeholder="Напр., улюблене місто"
                            onChange={(e) =>
                                setNewUser((prev) => ({ ...prev, recovery_hint: e.target.value }))
                            }
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end mt-4 gap-2">
                    <button
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-lg shadow-sm transition"
                        onClick={() =>
                            setNewUser({
                                username: '',
                                password: '',
                                recovery_hint: '',
                                role: 'user',
                            })
                        }
                    >
                        Скинути
                    </button>
                    <button
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
                        onClick={handleCreateUser}
                    >
                        ➕ Створити
                    </button>
                </div>
            </div>

            {/* Tools for list */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="flex-1">
                    <input
                        className="w-full border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg px-3 py-2 text-sm outline-none transition"
                        placeholder="Пошук за username…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>
                <button
                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                    onClick={() => setSortAsc((v) => !v)}
                >
                    Сортування: {sortAsc ? '↑ A–Z' : '↓ Z–A'}
                </button>
            </div>

            {/* Existing users */}
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
                    <>
                        {adminUsers.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-600 mb-2">
                                    Default admin
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {adminUsers.map((user) => (
                                        <UserCard
                                            key={`admin-${user.id}`}
                                            user={user}
                                            saving={savingId === user.id}
                                            onChange={(updater) =>
                                                setUsers((prev) =>
                                                    prev.map((u) =>
                                                        u.id === user.id && u.source === user.source
                                                            ? updater(u)
                                                            : u,
                                                    ),
                                                )
                                            }
                                            onSave={() => handleSave(user)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h4 className="text-sm font-semibold text-slate-600 mt-2 mb-2">
                                Звичайні користувачі
                            </h4>
                            {regularUsers.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                                    Нікого не знайдено за цим фільтром
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {regularUsers.map((user) => (
                                        <UserCard
                                            key={`user-${user.id}`}
                                            user={user}
                                            saving={savingId === user.id}
                                            generating={generatingId === user.id}
                                            deleting={deletingId === user.id}
                                            onChange={(updater) =>
                                                setUsers((prev) =>
                                                    prev.map((u) =>
                                                        u.id === user.id && u.source === user.source
                                                            ? updater(u)
                                                            : u,
                                                    ),
                                                )
                                            }
                                            onSave={() => handleSave(user)}
                                            onGenerateKey={() => handleGenerateKey(user)}
                                            onDelete={() => handleDelete(user)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

function UserCard({
    user,
    onChange,
    onSave,
    onGenerateKey,
    onDelete,
    saving,
    generating,
    deleting,
}: {
    user: FullUser;
    onChange: (updater: (u: FullUser) => FullUser) => void;
    onSave: () => void;
    onGenerateKey?: () => void;
    onDelete?: () => void;
    saving?: boolean;
    generating?: boolean;
    deleting?: boolean;
}) {
    const isAdminSource = user.source === 'default_admin';
    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
                <span
                    className={cls(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        isAdminSource
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800',
                    )}
                >
                    {user.source}
                </span>
                <div className="text-xs text-slate-400">
                    ID: <span className="font-mono">{user.id}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                        Username
                    </label>
                    <input
                        className="w-full border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg px-3 py-2 text-sm outline-none transition"
                        value={user.username}
                        onChange={(e) => onChange((u) => ({ ...u, username: e.target.value }))}
                    />
                </div>

                {/* Role */}
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                        Role
                    </label>
                    {isAdminSource ? (
                        <input
                            disabled
                            value="default_admin"
                            className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg px-3 py-2 text-sm"
                        />
                    ) : (
                        <select
                            className="w-full border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg px-3 py-2 text-sm outline-none transition"
                            value={user.role === 'admin' ? 'admin' : 'user'}
                            onChange={(e) =>
                                onChange((u) => ({ ...u, role: e.target.value as Role }))
                            }
                        >
                            <option value="admin">admin</option>
                            <option value="user">user</option>
                        </select>
                    )}
                </div>

                {/* Recovery hint */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                        Recovery Hint
                    </label>
                    <input
                        className="w-full border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg px-3 py-2 text-sm outline-none transition"
                        value={user.recovery_hint ?? ''}
                        onChange={(e) => onChange((u) => ({ ...u, recovery_hint: e.target.value }))}
                        placeholder="Фраза для відновлення"
                    />
                </div>

                {/* New password */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                        Новий пароль (необовʼязково)
                    </label>
                    <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg px-3 py-2 text-sm outline-none transition"
                        onChange={(e) => onChange((u) => ({ ...u, password: e.target.value }))}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                        Пароль не відображається і зберігається у хешованому вигляді
                    </p>
                </div>

                {/* Key */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                        Key
                    </label>
                    <div className="flex items-center gap-2">
                        <div className="text-xs text-slate-600 break-all border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 flex-1">
                            {user.key || '—'}
                        </div>
                        <button
                            className="px-2 py-2 text-xs bg-slate-700 hover:bg-slate-800 text-white rounded-lg shadow-sm transition"
                            onClick={() => user.key && navigator.clipboard.writeText(user.key)}
                            title="Copy"
                        >
                            ⧉
                        </button>
                        {user.source === 'auth_user' && onGenerateKey && (
                            <button
                                className={cls(
                                    'px-3 py-2 text-xs rounded-lg shadow-sm transition',
                                    generating
                                        ? 'bg-slate-300 text-slate-600 cursor-wait'
                                        : 'bg-slate-600 hover:bg-slate-700 text-white',
                                )}
                                onClick={onGenerateKey}
                                disabled={!!generating}
                                title="Generate new key"
                            >
                                {generating ? 'Generating…' : 'Generate'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end mt-6 gap-2">
                {!isAdminSource && onDelete && (
                    <button
                        className={cls(
                            'px-4 py-2 text-sm rounded-lg shadow-sm transition',
                            deleting
                                ? 'bg-rose-300 text-white cursor-wait'
                                : 'bg-rose-600 hover:bg-rose-700 text-white',
                        )}
                        onClick={onDelete}
                        disabled={!!deleting}
                    >
                        {deleting ? 'Видалення…' : '🗑 Видалити'}
                    </button>
                )}
                <button
                    className={cls(
                        'px-4 py-2 text-sm rounded-lg shadow-sm transition',
                        saving
                            ? 'bg-blue-300 text-white cursor-wait'
                            : 'bg-blue-600 hover:bg-blue-700 text-white',
                    )}
                    onClick={onSave}
                    disabled={!!saving}
                >
                    {saving ? 'Збереження…' : '💾 Зберегти'}
                </button>
            </div>
        </div>
    );
}
