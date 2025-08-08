import type { FullUser, Role } from './types';
import { cls } from './utils';

export default function UserCard({
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

            <div className="flex items-center justify-end mt-6 gap-2">
                {user.source !== 'default_admin' && onDelete && (
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
