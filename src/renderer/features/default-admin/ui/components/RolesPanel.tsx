// src/pages/admin/ui/components/RolesPanel.tsx
import { useEffect, useMemo, useState } from 'react';

import * as api from '../../model/api';

type Role = {
    id: number;
    name: string;
    description: string;
    allowed_tabs: string[];
};

const ALL_TABS = [
    { key: 'manager', label: 'Менеджер' },
    { key: 'backups', label: 'Резервні копії' },
    { key: 'reports', label: 'Звіти' },
    { key: 'tables', label: 'Таблиці' },
    { key: 'importUsers', label: 'Імпорт користувачів' },
    { key: 'shtatni', label: 'Штатні посади' },
    { key: 'instructions', label: 'Інструкції' },
    { key: 'admin', label: 'Адмін-панель' },
] as const;

export default function RolesPanel() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [creating, setCreating] = useState<{
        name: string;
        description: string;
        allowed_tabs: string[];
    }>({
        name: '',
        description: '',
        allowed_tabs: [],
    });
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const list = await api.fetchRoles();
            setRoles(list as any);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const toggleTab = (arr: string[], k: string) =>
        arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k];

    const create = async () => {
        if (!creating.name.trim()) return alert('Введіть назву ролі');
        setBusy(true);
        const res = await api.createRole(creating as any);
        setBusy(false);
        if (!res?.success) {
            alert(res?.message || 'Не вдалося створити роль');
            return;
        }
        setCreating({ name: '', description: '', allowed_tabs: [] });
        await load();
    };

    const updateRoleTabs = async (role: Role, k: string) => {
        const next = toggleTab(role.allowed_tabs, k);
        const res = await api.updateRole(role.id, { allowed_tabs: next });
        if (!res?.success) {
            alert(res?.message || 'Не вдалося оновити дозволи');
            return;
        }
        await load();
    };

    const remove = async (id: number, name: string) => {
        const ok = confirm(
            `Видалити роль «${name}»?\n\nУвага: якщо роль призначена користувачам, її не буде видалено.`,
        );
        if (!ok) return;
        const res = await api.deleteRole(id);
        if (res?.success) await load();
        else alert(res?.message || 'Не вдалося видалити роль');
    };

    const totalTabs = ALL_TABS.length;
    const totalRoles = roles.length;

    const emptyState = useMemo(
        () =>
            !loading &&
            roles.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">
                    <div className="font-medium mb-1">Немає жодної ролі</div>
                    <div className="text-sm">
                        Створіть першу роль: задайте <strong>назву</strong>, короткий{' '}
                        <strong>опис</strong> та позначте вкладки, до яких надається доступ.
                    </div>
                </div>
            ),
        [loading, roles.length],
    );

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                        Ролі та доступи до вкладок
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Ролі визначають, які розділи програми бачить і може відкривати користувач.
                        Виберіть вкладки для кожної ролі, потім призначте цю роль користувачам.
                    </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                    <span className="font-medium">{totalRoles}</span> ролі •{' '}
                    <span className="font-medium">{totalTabs}</span> вкладок
                </span>
            </div>

            {/* Create form */}
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500">Назва ролі</label>
                        <input
                            className="w-full border rounded-xl px-3 py-2 bg-white"
                            placeholder="Напр.: аналітик, оператор, ревізор"
                            value={creating.name}
                            onChange={(e) => setCreating((s) => ({ ...s, name: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs text-slate-500">Опис (необов’язково)</label>
                        <input
                            className="w-full border rounded-xl px-3 py-2 bg-white"
                            placeholder="Коротко опишіть призначення ролі"
                            value={creating.description}
                            onChange={(e) =>
                                setCreating((s) => ({ ...s, description: e.target.value }))
                            }
                        />
                    </div>
                </div>

                <div className="mt-3">
                    <div className="text-xs text-slate-500 mb-2">Дозволені вкладки</div>
                    <div className="flex flex-wrap gap-2">
                        {ALL_TABS.map((t) => {
                            const active = creating.allowed_tabs.includes(t.key);
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    className={`px-3 py-1.5 rounded-full border text-sm transition ${
                                        active
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white hover:bg-slate-100'
                                    }`}
                                    onClick={() =>
                                        setCreating((s) => ({
                                            ...s,
                                            allowed_tabs: toggleTab(s.allowed_tabs, t.key),
                                        }))
                                    }
                                >
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        disabled={busy}
                        onClick={create}
                        className="rounded-xl px-4 py-2 bg-slate-900 text-white disabled:opacity-50"
                    >
                        Створити роль
                    </button>
                </div>
            </div>

            {/* Roles list */}
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
                    {emptyState}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roles.map((role) => (
                            <div
                                key={role.id}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-semibold text-slate-900">
                                                {role.name}
                                            </div>
                                            <span className="text-xs rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-slate-600">
                                                {role.allowed_tabs.length} / {totalTabs} вкладок
                                            </span>
                                        </div>
                                        {role.description ? (
                                            <div className="text-sm text-slate-500 mt-1">
                                                {role.description}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-400 mt-1 italic">
                                                Без опису
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => remove(role.id, role.name)}
                                        className="text-red-600 text-xs hover:underline"
                                        title="Видалити роль"
                                    >
                                        Видалити
                                    </button>
                                </div>

                                <div className="mt-3">
                                    <div className="text-xs text-slate-500 mb-2">
                                        Дозволені вкладки
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {ALL_TABS.map((t) => {
                                            const on = role.allowed_tabs.includes(t.key);
                                            return (
                                                <button
                                                    key={t.key}
                                                    type="button"
                                                    className={`px-2.5 py-1.5 rounded-full border text-xs transition ${
                                                        on
                                                            ? 'bg-slate-900 text-white border-slate-900'
                                                            : 'bg-white hover:bg-slate-100'
                                                    }`}
                                                    onClick={() => updateRoleTabs(role, t.key)}
                                                    title={
                                                        on
                                                            ? 'Натисніть, щоб вимкнути доступ'
                                                            : 'Натисніть, щоб увімкнути доступ'
                                                    }
                                                >
                                                    {t.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
