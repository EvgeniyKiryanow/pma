import { useMemo } from 'react';

import type { NewUserState } from '../../model/types';
import { cls, scorePassword } from '../../model/utils';

export default function CreateUserForm({
    state,
    setState,
    onCreate,
}: {
    state: NewUserState;
    setState: (u: NewUserState) => void;
    onCreate: () => void;
}) {
    const pwScore = useMemo(() => scorePassword(state.password), [state.password]);

    return (
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
                        value={state.username}
                        placeholder="j.doe"
                        onChange={(e) => setState({ ...state, username: e.target.value })}
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                        Password
                    </label>
                    <input
                        type="password"
                        className="w-full border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg px-3 py-2 text-sm outline-none transition"
                        value={state.password}
                        placeholder="••••••••"
                        onChange={(e) => setState({ ...state, password: e.target.value })}
                    />
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
                        value={state.recovery_hint}
                        placeholder="Напр., улюблене місто"
                        onChange={(e) => setState({ ...state, recovery_hint: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex items-center justify-end mt-4 gap-2">
                <button
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-lg shadow-sm transition"
                    onClick={() =>
                        setState({ username: '', password: '', recovery_hint: '', role: 'user' })
                    }
                >
                    Скинути
                </button>
                <button
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
                    onClick={onCreate}
                >
                    ➕ Створити
                </button>
            </div>
        </div>
    );
}
