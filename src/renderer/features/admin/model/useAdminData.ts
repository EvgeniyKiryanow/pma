import { useCallback, useEffect, useState } from 'react';

import type { AccountDTO, RoleDTO } from '../../../../shared/auth/types';
import { errorMessage, unwrap } from '../../../shared/api/call';
import { useI18nStore } from '../../../stores/i18nStore';

/** Loads accounts and/or roles for the administration screens. */
export function useAdminData({
    accounts: loadAccounts,
    roles: loadRoles,
}: {
    accounts: boolean;
    roles: boolean;
}) {
    const t = useI18nStore((s) => s.t);
    const [accounts, setAccounts] = useState<AccountDTO[]>([]);
    const [roles, setRoles] = useState<RoleDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setError(null);
        try {
            const [nextAccounts, nextRoles] = await Promise.all([
                loadAccounts ? unwrap(window.electronAPI.accounts.list()) : Promise.resolve(null),
                loadRoles ? unwrap(window.electronAPI.roles.list()) : Promise.resolve(null),
            ]);
            if (nextAccounts) setAccounts(nextAccounts);
            if (nextRoles) setRoles(nextRoles);
        } catch (err) {
            setError(errorMessage(err, t));
        } finally {
            setLoading(false);
        }
    }, [loadAccounts, loadRoles, t]);

    useEffect(() => {
        void reload();
    }, [reload]);

    return { accounts, roles, loading, error, reload };
}
