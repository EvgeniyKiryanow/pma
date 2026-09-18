import { ScrollText, ShieldCheck, Users } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import type { PermissionKey } from '../../../../shared/auth/permissions';
import SideNav from '../../../shared/ui/SideNav';
import { useI18nStore } from '../../../stores/i18nStore';
import { usePermissions } from '../../../stores/sessionStore';
import AccountsPanel from './AccountsPanel';
import AuditPanel from './AuditPanel';
import RolesPanel from './RolesPanel';

type Section = {
    key: string;
    labelKey: string;
    hintKey: string;
    icon: ReactNode;
    permission: PermissionKey;
    render: () => ReactNode;
};

const SECTIONS: Section[] = [
    {
        key: 'accounts',
        labelKey: 'admin.tabs.accounts',
        hintKey: 'admin.tabsHint.accounts',
        icon: <Users />,
        permission: 'accounts.manage',
        render: () => <AccountsPanel />,
    },
    {
        key: 'roles',
        labelKey: 'admin.tabs.roles',
        hintKey: 'admin.tabsHint.roles',
        icon: <ShieldCheck />,
        permission: 'roles.manage',
        render: () => <RolesPanel />,
    },
    {
        key: 'audit',
        labelKey: 'admin.tabs.audit',
        hintKey: 'admin.tabsHint.audit',
        icon: <ScrollText />,
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
        <div className="flex min-h-0 flex-1">
            <SideNav
                title={t('admin.title')}
                value={active?.key ?? ''}
                onChange={setActiveKey}
                items={sections.map((section) => ({
                    value: section.key,
                    label: t(section.labelKey),
                    description: t(section.hintKey),
                    icon: section.icon,
                }))}
            />
            <main className="min-w-0 flex-1 overflow-y-auto p-6">
                <div key={active?.key} className="mx-auto max-w-5xl animate-fade-in">
                    {active?.render()}
                </div>
            </main>
        </div>
    );
}
