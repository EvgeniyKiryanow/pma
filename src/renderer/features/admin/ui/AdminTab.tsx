import { type ReactNode, useState } from 'react';

import type { PermissionKey } from '../../../../shared/auth/permissions';
import { cn } from '../../../shared/ui';
import { useI18nStore } from '../../../stores/i18nStore';
import { usePermissions } from '../../../stores/sessionStore';
import AccountsPanel from './AccountsPanel';
import AuditPanel from './AuditPanel';
import RolesPanel from './RolesPanel';

type Section = {
    key: string;
    labelKey: string;
    permission: PermissionKey;
    render: () => ReactNode;
};

const SECTIONS: Section[] = [
    {
        key: 'accounts',
        labelKey: 'admin.tabs.accounts',
        permission: 'accounts.manage',
        render: () => <AccountsPanel />,
    },
    {
        key: 'roles',
        labelKey: 'admin.tabs.roles',
        permission: 'roles.manage',
        render: () => <RolesPanel />,
    },
    {
        key: 'audit',
        labelKey: 'admin.tabs.audit',
        permission: 'audit.view',
        render: () => <AuditPanel />,
    },
];

export default function AdminTab() {
    const { t } = useI18nStore();
    const { can } = usePermissions();
    const sections = SECTIONS.filter((section) => can(section.permission));
    const [activeKey, setActiveKey] = useState(sections[0]?.key);
    const active = sections.find((s) => s.key === activeKey) ?? sections[0];

    return (
        <div className="flex h-full min-h-0 flex-1">
            <aside className="w-56 shrink-0 space-y-1 border-r bg-gray-100 p-4">
                <h2 className="mb-3 text-lg font-semibold text-gray-800">{t('admin.title')}</h2>
                {sections.map((section) => (
                    <button
                        key={section.key}
                        onClick={() => setActiveKey(section.key)}
                        className={cn(
                            'w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-200',
                            active?.key === section.key && 'bg-gray-200 font-medium',
                        )}
                    >
                        {t(section.labelKey)}
                    </button>
                ))}
            </aside>
            <main className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-5xl">{active?.render()}</div>
            </main>
        </div>
    );
}
