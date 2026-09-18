import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';

import {
    dependentsOf,
    expandPermissions,
    type PermissionKey,
    permissionsByGroup,
} from '../../../../shared/auth/permissions';
import type { RoleDTO } from '../../../../shared/auth/types';
import { errorMessage } from '../../../shared/api/call';
import { rolesApi } from '../../../shared/api/security';
import { Alert, Badge, Button, Card, Modal, TextField } from '../../../shared/ui';
import { confirmAction } from '../../../shared/ui/confirm';
import { toast } from '../../../shared/ui/toast';
import { useI18nStore } from '../../../stores/i18nStore';
import { useAdminData } from '../model/useAdminData';

export default function RolesPanel() {
    const { t } = useI18nStore();
    const { roles, loading, error, reload } = useAdminData({ accounts: false, roles: true });
    const [editing, setEditing] = useState<RoleDTO | 'new' | null>(null);

    const remove = async (role: RoleDTO) => {
        const confirmed = await confirmAction({
            title: t('admin.roles.delete'),
            message: t('admin.roles.confirmDelete', { name: role.name }),
            confirmLabel: t('admin.roles.delete'),
            tone: 'danger',
        });
        if (!confirmed) return;
        try {
            await rolesApi.remove(role.id);
            toast.success(t('admin.roles.deleted'));
            await reload();
        } catch (err) {
            toast.error(errorMessage(err, t));
        }
    };

    return (
        <Card
            title={t('admin.roles.title')}
            description={t('admin.roles.description')}
            icon={<ShieldCheck />}
            actions={
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>
                    {t('admin.roles.add')}
                </Button>
            }
        >
            {error && (
                <Alert tone="error" className="mb-3">
                    {error}
                </Alert>
            )}
            {!loading && (
                <div className="grid gap-3 md:grid-cols-2">
                    {roles.map((role) => (
                        <div
                            key={role.id}
                            className="rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {role.isSystem && (
                                            <ShieldCheck className="h-4 w-4 text-primary-ink" />
                                        )}
                                        <span className="font-semibold text-ink">{role.name}</span>
                                        {role.isSystem && (
                                            <Badge tone="olive">{t('admin.roles.system')}</Badge>
                                        )}
                                    </div>
                                    {role.description && (
                                        <p className="mt-1 text-sm text-ink-2">
                                            {role.description}
                                        </p>
                                    )}
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-3">
                                        <span>
                                            {t('admin.roles.accounts', {
                                                count: role.accountCount,
                                            })}
                                        </span>
                                        <span>·</span>
                                        <span>
                                            {role.grantsAll
                                                ? t('admin.roles.allPermissions')
                                                : t('admin.roles.summary', {
                                                      count: role.permissions.length,
                                                  })}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        icon={<Pencil className="h-3.5 w-3.5" />}
                                        onClick={() => setEditing(role)}
                                    >
                                        {t('admin.roles.edit')}
                                    </Button>
                                    {!role.isSystem && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                                            icon={<Trash2 className="h-3.5 w-3.5" />}
                                            disabled={role.accountCount > 0}
                                            onClick={() => void remove(role)}
                                        >
                                            {t('admin.roles.delete')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editing && (
                <RoleEditorDialog
                    role={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        void reload();
                    }}
                />
            )}
        </Card>
    );
}

function RoleEditorDialog({
    role,
    onClose,
    onSaved,
}: {
    role: RoleDTO | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { t } = useI18nStore();
    const isSystem = Boolean(role?.isSystem);
    const [name, setName] = useState(role?.name ?? '');
    const [description, setDescription] = useState(role?.description ?? '');
    const [selected, setSelected] = useState<Set<PermissionKey>>(() =>
        expandPermissions(role?.permissions ?? []),
    );
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const groups = useMemo(() => permissionsByGroup(), []);

    // Selection is always closed under dependencies: enabling adds requirements,
    // disabling removes everything that depends on the permission.
    const toggle = (key: PermissionKey) => {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(key)) {
                next.delete(key);
                for (const dependent of dependentsOf(key)) next.delete(dependent);
                return next;
            }
            return expandPermissions([...next, key]);
        });
    };

    const setGroup = (keys: PermissionKey[], enabled: boolean) => {
        setSelected((current) => {
            if (enabled) return expandPermissions([...current, ...keys]);
            const next = new Set(current);
            for (const key of keys) {
                next.delete(key);
                for (const dependent of dependentsOf(key)) next.delete(dependent);
            }
            return next;
        });
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setBusy(true);
        const input = { name, description, permissions: [...selected] };
        try {
            if (role) await rolesApi.update(role.id, input);
            else await rolesApi.create(input);
            toast.success(t('admin.roles.saved'));
            onSaved();
        } catch (err) {
            setError(errorMessage(err, t));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            width="max-w-3xl"
            title={
                role
                    ? t('admin.roles.editTitle', { name: role.name })
                    : t('admin.roles.createTitle')
            }
        >
            <form id="role-form" onSubmit={submit} className="space-y-4">
                {error && <Alert tone="error">{error}</Alert>}
                <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                        label={t('admin.roles.name')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoFocus
                    />
                    <TextField
                        label={t('admin.roles.descriptionField')}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div>
                    <h4 className="mb-1 text-sm font-semibold text-ink">
                        {t('admin.roles.permissions')}
                    </h4>
                    <p className="mb-3 text-xs text-ink-3">
                        {isSystem ? t('admin.roles.systemNote') : t('admin.roles.requiresNote')}
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                        {groups.map(({ group, items }) => {
                            const keys = items.map((item) => item.key);
                            return (
                                <fieldset
                                    key={group}
                                    className="rounded-xl border border-line p-3.5"
                                    disabled={isSystem}
                                >
                                    <legend className="flex w-full items-center justify-between gap-2 px-1 text-sm font-medium text-ink">
                                        <span>{t(`permissionGroups.${group}`)}</span>
                                        {!isSystem && (
                                            <span className="flex gap-2 text-xs font-normal">
                                                <button
                                                    type="button"
                                                    className="font-medium text-primary-ink hover:underline"
                                                    onClick={() => setGroup(keys, true)}
                                                >
                                                    {t('admin.roles.selectAll')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="text-ink-3 hover:underline"
                                                    onClick={() => setGroup(keys, false)}
                                                >
                                                    {t('admin.roles.selectNone')}
                                                </button>
                                            </span>
                                        )}
                                    </legend>
                                    <div className="space-y-1.5">
                                        {items.map((item) => (
                                            <label
                                                key={item.key}
                                                className="flex items-start gap-2 text-sm text-ink-2"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="mt-0.5"
                                                    checked={isSystem || selected.has(item.key)}
                                                    onChange={() => toggle(item.key)}
                                                />
                                                <span>
                                                    {t(`permissions.${item.key}`)}
                                                    {item.sensitive && (
                                                        <span className="ml-1 text-xs text-warning-ink">
                                                            ({t('admin.roles.sensitive')})
                                                        </span>
                                                    )}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            );
                        })}
                    </div>
                </div>
            </form>
            <div className="mt-6 flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>
                    {t('common.cancel')}
                </Button>
                <Button type="submit" form="role-form" loading={busy}>
                    {t('common.save')}
                </Button>
            </div>
        </Modal>
    );
}
