// src/pages/admin/ui/components/RolesPanel.tsx
import { useEffect, useState } from 'react';

import * as api from '../../model/api';

const ALL_TABS = [
    { key: 'manager', label: 'Manager' },
    { key: 'backups', label: 'Backups' },
    { key: 'reports', label: 'Reports' },
    { key: 'tables', label: 'Tables' },
    { key: 'importUsers', label: 'Import Users' },
    { key: 'shtatni', label: 'Shtатні посади' },
    { key: 'instructions', label: 'Instructions' },
    { key: 'admin', label: 'Admin Management' },
];

export default function RolesPanel() {
    const [roles, setRoles] = useState<any[]>([]);
    const [creating, setCreating] = useState({
        name: '',
        description: '',
        allowed_tabs: [] as string[],
    });
    const [busy, setBusy] = useState(false);

    const load = async () => setRoles(await api.fetchRoles());
    useEffect(() => {
        load();
    }, []);

    const toggleTab = (arr: string[], k: string) =>
        arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k];

    const create = async () => {
        if (!creating.name.trim()) return;
        setBusy(true);
        await api.createRole(creating);
        setCreating({ name: '', description: '', allowed_tabs: [] });
        await load();
        setBusy(false);
    };

    const updateRoleTabs = async (role: any, k: string) => {
        const next = toggleTab(role.allowed_tabs, k);
        await api.updateRole(role.id, { allowed_tabs: next });
        await load();
    };

    const remove = async (id: number) => {
        const ok = confirm('Delete this role?');
        if (!ok) return;
        const res = await api.deleteRole(id);
        if (res?.success) await load();
        else alert(res?.message || 'Cannot delete role');
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-semibold">Ролі та доступи</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                    className="border rounded-xl px-3 py-2"
                    placeholder="role name (e.g. analyst)"
                    value={creating.name}
                    onChange={(e) => setCreating((s) => ({ ...s, name: e.target.value }))}
                />
                <input
                    className="border rounded-xl px-3 py-2"
                    placeholder="description"
                    value={creating.description}
                    onChange={(e) => setCreating((s) => ({ ...s, description: e.target.value }))}
                />
                <button
                    disabled={busy}
                    onClick={create}
                    className="rounded-xl px-4 py-2 bg-slate-900 text-white disabled:opacity-50"
                >
                    Create role
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {ALL_TABS.map((t) => {
                    const active = creating.allowed_tabs.includes(t.key);
                    return (
                        <button
                            key={t.key}
                            className={`px-3 py-1 rounded-full border ${active ? 'bg-slate-900 text-white' : 'bg-white'}`}
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

            <div className="divide-y">
                {roles.map((role) => (
                    <div key={role.id} className="py-4 flex items-start justify-between gap-4">
                        <div>
                            <div className="font-medium">{role.name}</div>
                            <div className="text-sm text-slate-500">{role.description}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {ALL_TABS.map((t) => {
                                    const on = role.allowed_tabs.includes(t.key);
                                    return (
                                        <button
                                            key={t.key}
                                            className={`px-2 py-1 rounded-full border text-xs ${on ? 'bg-slate-900 text-white' : 'bg-white'}`}
                                            onClick={() => updateRoleTabs(role, t.key)}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <button onClick={() => remove(role.id)} className="text-red-600 text-sm">
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
