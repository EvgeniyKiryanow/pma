import { KeyRound, Lock, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import type { AccountDTO, RoleDTO } from '../../../../shared/auth/types';
import { PASSWORD_RULES } from '../../../../shared/auth/types';
import { errorMessage, unwrap } from '../../../shared/api/call';
import {
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    formatDateTime,
    Modal,
    PasswordField,
    SelectField,
    TextField,
} from '../../../shared/ui';
import { confirmAction } from '../../../shared/ui/confirm';
import { toast } from '../../../shared/ui/toast';
import { useI18nStore } from '../../../stores/i18nStore';
import { useSessionStore } from '../../../stores/sessionStore';
import { useAdminData } from '../model/useAdminData';

type Dialog =
    | { type: 'create' }
    | { type: 'edit'; account: AccountDTO }
    | { type: 'reset'; account: AccountDTO }
    | null;

export default function AccountsPanel() {
    const { t } = useI18nStore();
    const currentAccountId = useSessionStore((s) => s.session?.accountId);
    const { accounts, roles, loading, error, reload } = useAdminData({
        accounts: true,
        roles: true,
    });
    const [dialog, setDialog] = useState<Dialog>(null);

    const act = async (work: () => Promise<unknown>, success: string) => {
        try {
            await work();
            toast.success(success);
            await reload();
        } catch (err) {
            toast.error(errorMessage(err, t));
        }
    };

    const remove = async (account: AccountDTO) => {
        const confirmed = await confirmAction({
            title: t('admin.accounts.delete'),
            message: t('admin.accounts.confirmDelete', { name: account.username }),
            confirmLabel: t('admin.accounts.delete'),
            tone: 'danger',
        });
        if (!confirmed) return;
        void act(
            () => unwrap(window.electronAPI.accounts.remove(account.id)),
            t('admin.accounts.deleted'),
        );
    };

    return (
        <Card
            title={t('admin.accounts.title')}
            description={t('admin.accounts.description')}
            icon={<Users />}
            actions={
                <Button
                    icon={<UserPlus className="h-4 w-4" />}
                    onClick={() => setDialog({ type: 'create' })}
                >
                    {t('admin.accounts.add')}
                </Button>
            }
        >
            {error && (
                <Alert tone="error" className="mb-3">
                    {error}
                </Alert>
            )}
            {!loading && accounts.length === 0 && (
                <p className="text-sm text-ink-3">{t('admin.accounts.empty')}</p>
            )}

            {accounts.length > 0 && (
                <div className="-mx-5 -mb-5 overflow-x-auto border-t border-line">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{t('admin.accounts.username')}</th>
                                <th>{t('admin.accounts.role')}</th>
                                <th>{t('admin.accounts.status')}</th>
                                <th>{t('admin.accounts.lastLogin')}</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.map((account) => {
                                const isSelf = account.id === currentAccountId;
                                return (
                                    <tr key={account.id}>
                                        <td>
                                            <div className="flex items-center gap-2.5">
                                                <Avatar
                                                    name={account.displayName || account.username}
                                                    size={32}
                                                />
                                                <div className="min-w-0">
                                                    <div className="font-medium text-ink">
                                                        {account.username}
                                                        {isSelf && (
                                                            <span className="ml-2 text-xs font-normal text-ink-3">
                                                                ({t('admin.accounts.you')})
                                                            </span>
                                                        )}
                                                    </div>
                                                    {account.displayName && (
                                                        <div className="text-xs text-ink-3">
                                                            {account.displayName}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <Badge tone={account.roleGrantsAll ? 'olive' : 'gray'}>
                                                {account.roleName}
                                            </Badge>
                                        </td>
                                        <td className="space-x-1 space-y-1">
                                            {account.isActive ? (
                                                <Badge tone="green">
                                                    {t('admin.accounts.active')}
                                                </Badge>
                                            ) : (
                                                <Badge tone="red">
                                                    {t('admin.accounts.inactive')}
                                                </Badge>
                                            )}
                                            {account.lockedUntil && (
                                                <Badge tone="red">
                                                    <Lock className="size-3" />
                                                    {formatDateTime(account.lockedUntil)}
                                                </Badge>
                                            )}
                                            {account.mustChangePassword && (
                                                <Badge tone="amber">
                                                    {t('admin.accounts.mustChange')}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap text-ink-2">
                                            {formatDateTime(account.lastLoginAt)}
                                        </td>
                                        <td>
                                            <div className="flex flex-wrap justify-end gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    icon={<Pencil className="h-3.5 w-3.5" />}
                                                    onClick={() =>
                                                        setDialog({ type: 'edit', account })
                                                    }
                                                >
                                                    {t('admin.accounts.edit')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    icon={<KeyRound className="h-3.5 w-3.5" />}
                                                    onClick={() =>
                                                        setDialog({ type: 'reset', account })
                                                    }
                                                >
                                                    {t('admin.accounts.resetPassword')}
                                                </Button>
                                                {account.lockedUntil && (
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        icon={<Lock className="h-3.5 w-3.5" />}
                                                        onClick={() =>
                                                            void act(
                                                                () =>
                                                                    unwrap(
                                                                        window.electronAPI.accounts.unlock(
                                                                            account.id,
                                                                        ),
                                                                    ),
                                                                t('admin.accounts.unlocked'),
                                                            )
                                                        }
                                                    >
                                                        {t('admin.accounts.unlock')}
                                                    </Button>
                                                )}
                                                {!isSelf && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                                                        icon={<Trash2 className="h-3.5 w-3.5" />}
                                                        onClick={() => void remove(account)}
                                                    >
                                                        {t('admin.accounts.delete')}
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {dialog?.type === 'create' && (
                <AccountFormDialog
                    roles={roles}
                    onClose={() => setDialog(null)}
                    onSaved={() => {
                        setDialog(null);
                        void reload();
                    }}
                />
            )}
            {dialog?.type === 'edit' && (
                <AccountFormDialog
                    roles={roles}
                    account={dialog.account}
                    isSelf={dialog.account.id === currentAccountId}
                    onClose={() => setDialog(null)}
                    onSaved={() => {
                        setDialog(null);
                        void reload();
                    }}
                />
            )}
            {dialog?.type === 'reset' && (
                <ResetPasswordDialog
                    account={dialog.account}
                    onClose={() => setDialog(null)}
                    onSaved={() => {
                        setDialog(null);
                        void reload();
                    }}
                />
            )}
        </Card>
    );
}

function AccountFormDialog({
    roles,
    account,
    isSelf = false,
    onClose,
    onSaved,
}: {
    roles: RoleDTO[];
    account?: AccountDTO;
    isSelf?: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { t } = useI18nStore();
    const isEdit = Boolean(account);
    const [username, setUsername] = useState(account?.username ?? '');
    const [displayName, setDisplayName] = useState(account?.displayName ?? '');
    const [roleId, setRoleId] = useState<number>(
        account?.roleId ?? roles.find((r) => !r.isSystem)?.id ?? roles[0]?.id ?? 0,
    );
    const [isActive, setIsActive] = useState(account?.isActive ?? true);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setBusy(true);
        try {
            if (account) {
                await unwrap(
                    window.electronAPI.accounts.update(account.id, {
                        displayName,
                        roleId,
                        isActive,
                    }),
                );
                toast.success(t('admin.accounts.saved'));
            } else {
                await unwrap(
                    window.electronAPI.accounts.create({ username, displayName, roleId, password }),
                );
                toast.success(t('admin.accounts.created'));
            }
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
            title={
                account
                    ? t('admin.accounts.editTitle', { name: account.username })
                    : t('admin.accounts.createTitle')
            }
        >
            <form id="account-form" onSubmit={submit} className="space-y-4">
                {error && <Alert tone="error">{error}</Alert>}
                <TextField
                    label={t('admin.accounts.username')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isEdit}
                    required
                    autoFocus={!isEdit}
                />
                <TextField
                    label={t('admin.accounts.displayName')}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                />
                <SelectField
                    label={t('admin.accounts.role')}
                    value={roleId}
                    onChange={(value) => setRoleId(Number(value))}
                    options={roles.map((role) => ({ value: role.id, label: role.name }))}
                />
                {!isEdit && (
                    <PasswordField
                        label={t('admin.accounts.temporaryPassword')}
                        hint={`${t('admin.accounts.temporaryHint')} ${t('auth.passwordHint', { min: PASSWORD_RULES.minLength })}`}
                        value={password}
                        minLength={PASSWORD_RULES.minLength}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                )}
                {isEdit && !isSelf && (
                    <label className="flex items-center gap-2.5 rounded-xl border border-line px-3.5 py-3 text-sm text-ink">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                        />
                        {t('admin.accounts.isActive')}
                    </label>
                )}
            </form>
            <div className="mt-6 flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>
                    {t('common.cancel')}
                </Button>
                <Button type="submit" form="account-form" loading={busy}>
                    {t('common.save')}
                </Button>
            </div>
        </Modal>
    );
}

function ResetPasswordDialog({
    account,
    onClose,
    onSaved,
}: {
    account: AccountDTO;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { t } = useI18nStore();
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setBusy(true);
        try {
            await unwrap(window.electronAPI.accounts.resetPassword(account.id, password));
            toast.success(t('admin.accounts.passwordReset'));
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
            title={t('admin.accounts.resetTitle', { name: account.username })}
        >
            <form onSubmit={submit} className="space-y-4">
                {error && <Alert tone="error">{error}</Alert>}
                <Alert tone="info">{t('admin.accounts.temporaryHint')}</Alert>
                <PasswordField
                    label={t('admin.accounts.temporaryPassword')}
                    hint={t('auth.passwordHint', { min: PASSWORD_RULES.minLength })}
                    value={password}
                    minLength={PASSWORD_RULES.minLength}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                />
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" loading={busy}>
                        {t('admin.accounts.resetPassword')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
