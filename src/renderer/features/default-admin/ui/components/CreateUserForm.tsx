// src/pages/admin/ui/components/CreateUserForm.tsx
import { useMemo } from 'react';

import type { NewUserState } from '../../model/types';

type RoleOption = { id: number; name: string };

export type CreateUserFormProps = {
    state: NewUserState;
    setState: (s: NewUserState | ((s: NewUserState) => NewUserState)) => void;
    // Allow async OR sync:
    onCreate: () => void | Promise<void>;
    // NEW (optional to keep backward compat):
    roles?: RoleOption[];
    selectedRoleId?: number | null;
    setSelectedRoleId?: (id: number | null) => void;
};

export default function CreateUserForm({
    state,
    setState,
    onCreate,
    roles = [],
    selectedRoleId,
    setSelectedRoleId,
}: CreateUserFormProps) {
    const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id, label: r.name })), [roles]);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Створити користувача</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1 md:col-span-1">
                    <label className="text-xs text-slate-500">Логін</label>
                    <input
                        className="w-full border rounded-xl px-3 py-2 bg-white"
                        placeholder="username"
                        value={state.username}
                        onChange={(e) => setState({ ...state, username: e.target.value })}
                    />
                </div>

                <div className="space-y-1 md:col-span-1">
                    <label className="text-xs text-slate-500">Пароль</label>
                    <input
                        type="password"
                        className="w-full border rounded-xl px-3 py-2 bg-white"
                        placeholder="••••••••"
                        value={state.password}
                        onChange={(e) => setState({ ...state, password: e.target.value })}
                    />
                </div>

                <div className="space-y-1 md:col-span-1">
                    <label className="text-xs text-slate-500">
                        Підказка для відновлення (необов’язково)
                    </label>
                    <input
                        className="w-full border rounded-xl px-3 py-2 bg-white"
                        placeholder="Напр.: улюблена страва"
                        value={state.recovery_hint}
                        onChange={(e) => setState({ ...state, recovery_hint: e.target.value })}
                    />
                </div>

                <div className="space-y-1 md:col-span-1">
                    <label className="text-xs text-slate-500">Роль</label>
                    <select
                        className="w-full border rounded-xl px-3 py-2 bg-white"
                        value={selectedRoleId ?? ''}
                        onChange={(e) =>
                            setSelectedRoleId?.(e.target.value ? Number(e.target.value) : null)
                        }
                    >
                        {roleOptions.length === 0 && <option value="">— немає ролей —</option>}
                        {roleOptions.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                        Оберіть роль (набір доступних вкладок визначається в «Ролі та доступи»).
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={onCreate} className="rounded-xl px-4 py-2 bg-slate-900 text-white">
                    Додати користувача
                </button>
            </div>
        </div>
    );
}
