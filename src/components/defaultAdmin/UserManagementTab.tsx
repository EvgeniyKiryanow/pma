import { useEffect, useState } from 'react';

type FullUser = {
    id: number;
    username: string;
    password: string;
    recovery_hint: string | null;
    key: string;
    role: string;
    source: 'default_admin' | 'auth_user';
};

export default function UserManagementTab() {
    const [users, setUsers] = useState<FullUser[]>([]);
    const [message, setMessage] = useState<string | null>(null);

    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        recovery_hint: '',
        role: 'user',
    });

    const fetchAllUsers = async () => {
        const authUsers = await window.electronAPI.getAuthUsers();
        const defaultAdmin = await window.electronAPI.getDefaultAdmin();

        const formattedAuthUsers: FullUser[] = authUsers.map((u) => ({
            id: u.id,
            username: u.username,
            password: '',
            recovery_hint: u.recovery_hint || null,
            key: u.key || '',
            role: u.role === 'admin' ? 'admin' : 'user',
            source: 'auth_user',
        }));

        const adminUser: FullUser[] = defaultAdmin
            ? [
                  {
                      id: defaultAdmin.id,
                      username: defaultAdmin.username,
                      password: '',
                      recovery_hint: defaultAdmin.recovery_hint || null,
                      key: defaultAdmin.key,
                      role: 'default_admin',
                      source: 'default_admin',
                  },
              ]
            : [];

        setUsers([...adminUser, ...formattedAuthUsers]);
    };

    const handleSave = async (user: FullUser) => {
        const update: any = {
            username: user.username,
            recovery_hint: user.recovery_hint,
            role: user.role,
        };

        if (user.password && user.password.length < 50) {
            update.password = user.password;
        }

        if (user.source === 'default_admin') {
            await window.electronAPI.updateDefaultAdmin(update);
        } else {
            await window.electronAPI.updateAuthUser(user.id, update);
        }

        setMessage('Зміни збережено');
        fetchAllUsers();
    };

    const handleCreateUser = async () => {
        if (!newUser.username || !newUser.password) {
            setMessage('❗ Введіть логін і пароль');
            return;
        }

        await window.electronAPI.register(
            newUser.username.trim().toLowerCase(),
            newUser.password,
            newUser.recovery_hint || '',
        );

        setMessage('✅ Користувача створено');
        setNewUser({ username: '', password: '', recovery_hint: '', role: 'user' });
        fetchAllUsers();
    };

    useEffect(() => {
        fetchAllUsers();
    }, []);

    useEffect(() => {
        if (message) {
            const timeout = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timeout);
        }
    }, [message]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Управління користувачами</h2>

            {message && (
                <div className="p-3 bg-green-100 border border-green-300 text-green-800 rounded shadow-sm transition">
                    {message}
                </div>
            )}

            {/* Create User Card */}
            <div className="rounded-xl border-2 border-dashed bg-white shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                            Username
                        </label>
                        <input
                            className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                            value={newUser.username}
                            onChange={(e) =>
                                setNewUser((prev) => ({ ...prev, username: e.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                            value={newUser.password}
                            onChange={(e) =>
                                setNewUser((prev) => ({ ...prev, password: e.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                            Recovery Hint
                        </label>
                        <input
                            className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                            value={newUser.recovery_hint}
                            onChange={(e) =>
                                setNewUser((prev) => ({
                                    ...prev,
                                    recovery_hint: e.target.value,
                                }))
                            }
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded shadow-sm transition"
                        onClick={handleCreateUser}
                    >
                        ➕ Створити користувача
                    </button>
                </div>
            </div>

            {/* Existing Users */}
            <div className="space-y-6">
                {users.map((user, idx) => (
                    <div
                        key={`${user.source}-${user.id}`}
                        className="rounded-xl border bg-white shadow-sm transition hover:shadow-md p-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">
                                    Джерело
                                </label>
                                <span
                                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                        user.source === 'default_admin'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-blue-100 text-blue-800'
                                    }`}
                                >
                                    {user.source}
                                </span>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">
                                    Username
                                </label>
                                <input
                                    className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                                    value={user.username}
                                    onChange={(e) =>
                                        setUsers((prev) =>
                                            prev.map((u, i) =>
                                                i === idx ? { ...u, username: e.target.value } : u,
                                            ),
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">
                                    Role
                                </label>
                                <select
                                    className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                                    value={user.role}
                                    onChange={(e) =>
                                        setUsers((prev) =>
                                            prev.map((u, i) =>
                                                i === idx ? { ...u, role: e.target.value } : u,
                                            ),
                                        )
                                    }
                                >
                                    <option value="default_admin">default_admin</option>
                                    <option value="admin">admin</option>
                                    <option value="user">user</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">
                                    Recovery Hint
                                </label>
                                <input
                                    className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                                    value={user.recovery_hint ?? ''}
                                    onChange={(e) =>
                                        setUsers((prev) =>
                                            prev.map((u, i) =>
                                                i === idx
                                                    ? { ...u, recovery_hint: e.target.value }
                                                    : u,
                                            ),
                                        )
                                    }
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-600 mb-1">
                                    Новий пароль (необовʼязково)
                                </label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                                    onChange={(e) =>
                                        setUsers((prev) =>
                                            prev.map((u, i) =>
                                                i === idx ? { ...u, password: e.target.value } : u,
                                            ),
                                        )
                                    }
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-600 mb-1">
                                    Key
                                </label>
                                <div className="text-xs text-gray-500 break-words">{user.key}</div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition"
                                onClick={() => handleSave(user)}
                            >
                                💾 Зберегти
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
