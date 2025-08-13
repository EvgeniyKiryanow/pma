// src/pages/admin/ui/components/UserList.tsx
import { useMemo, useState } from 'react';

import * as api from '../../model/api';
import type { FullUser } from '../../model/types';

type RoleLite = { id: number; name: string };

type Props = {
    admins: FullUser[];
    users: FullUser[];
    roles: RoleLite[];
    savingId: number | null;
    generatingId: number | null;
    deletingId: number | null;
    onChangeUser: (
        id: number,
        source: FullUser['source'],
        updater: (u: FullUser) => FullUser,
    ) => void;
    onSaveUser: (user: FullUser) => void;
    onGenerateKey: (user: FullUser) => void;
    onDeleteUser: (user: FullUser) => void;
};

export default function UserList({
    admins,
    users,
    roles,
    savingId,
    generatingId,
    deletingId,
    onChangeUser,
    onSaveUser,
    onGenerateKey,
    onDeleteUser,
}: Props) {
    // локальні вибори ролей по користувачу (щоб не ламати зовнішні пропси)
    const [roleSel, setRoleSel] = useState<Record<number, number | ''>>({});

    const roleMap = useMemo(() => new Map(roles.map((r) => [r.id, r.name])), [roles]);

    const assignRole = async (user: FullUser) => {
        const sel = roleSel[user.id];
        if (sel === undefined || sel === '') return;
        try {
            const res = await api.setUserRole(user.id, Number(sel));
            if (res?.success) {
                // локально оновимо картку
                onChangeUser(user.id, user.source, (u) => ({
                    ...u,
                    // збережемо зручні для відображення поля (якщо ви їх показуєте)
                    ...(u as any),
                    role_id: Number(sel),
                    role: (roleMap.get(Number(sel)) as any) ?? u.role,
                    role_name: roleMap.get(Number(sel)) ?? (u as any).role_name,
                }));
            } else {
                alert(res?.message || 'Не вдалося призначити роль');
            }
        } catch {
            alert('Помилка при призначенні ролі');
        }
    };

    const renderRow = (user: FullUser, isAdmin = false) => {
        const currentRoleName =
            (user as any).role_name ??
            (typeof user.role === 'string' ? user.role : '') ??
            (isAdmin ? 'default_admin' : 'user');

        const currentRoleId = (user as any).role_id as number | undefined;

        return (
            <div
                key={`${isAdmin ? 'admin' : 'user'}-${user.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{user.username}</div>
                        <div className="text-xs text-slate-500">
                            ID: {user.id} • Джерело: {user.source}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                            {/* Роль: <span className="font-medium">{currentRoleName}</span> */}
                        </div>
                        {user.source === 'auth_user' && (
                            <div className="mt-2 flex items-center gap-2">
                                <select
                                    className="border rounded-md px-2 py-1 text-sm bg-white"
                                    value={roleSel[user.id] ?? currentRoleId ?? ''}
                                    onChange={(e) =>
                                        setRoleSel((s) => ({
                                            ...s,
                                            [user.id]: e.target.value ? Number(e.target.value) : '',
                                        }))
                                    }
                                >
                                    <option value="">— оберіть роль —</option>
                                    {roles.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    className="text-xs px-3 py-1 rounded-md border bg-slate-900 text-white disabled:opacity-50"
                                    onClick={() => assignRole(user)}
                                    disabled={
                                        roleSel[user.id] === '' || roleSel[user.id] === undefined
                                    }
                                    title="Призначити вибрану роль"
                                >
                                    Призначити роль
                                </button>
                            </div>
                        )}
                        <div className="text-xs text-slate-500 mt-1">
                            Ключ: {user.key ? `${user.key.slice(0, 6)}…${user.key.slice(-4)}` : '—'}
                        </div>
                        {user.recovery_hint && (
                            <div className="text-xs text-slate-500">
                                Підказка: {user.recovery_hint}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                        {user.source === 'auth_user' ? (
                            <>
                                <button
                                    onClick={() => onSaveUser(user)}
                                    className="text-xs px-3 py-1 rounded-md border bg-white hover:bg-slate-50 disabled:opacity-50"
                                    disabled={savingId === user.id}
                                >
                                    {savingId === user.id ? 'Збереження…' : 'Зберегти'}
                                </button>
                                <button
                                    onClick={() => onGenerateKey(user)}
                                    className="text-xs px-3 py-1 rounded-md border bg-white hover:bg-slate-50 disabled:opacity-50"
                                    disabled={generatingId === user.id}
                                >
                                    {generatingId === user.id ? 'Генерація…' : 'Згенерувати ключ'}
                                </button>
                                <button
                                    onClick={() => onDeleteUser(user)}
                                    className="text-xs px-3 py-1 rounded-md border bg-red-50 hover:bg-red-100 text-red-700 border-red-200 disabled:opacity-50"
                                    disabled={deletingId === user.id}
                                >
                                    {deletingId === user.id ? 'Видалення…' : 'Видалити'}
                                </button>
                            </>
                        ) : (
                            <span className="text-[10px] text-slate-500">Default admin</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {admins.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-slate-600 mb-2">Default admin</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {admins.map((u) => renderRow(u, true))}
                    </div>
                </div>
            )}

            <div>
                <h4 className="text-sm font-semibold text-slate-600 mt-2 mb-2">
                    Звичайні користувачі
                </h4>
                {users.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                        Нікого не знайдено за цим фільтром
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {users.map((u) => renderRow(u))}
                    </div>
                )}
            </div>
        </>
    );
}
