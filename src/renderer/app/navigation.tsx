import {
    DatabaseBackup,
    FileText,
    LifeBuoy,
    ListTree,
    ShieldCheck,
    Sheet,
    Users,
} from 'lucide-react';
import type { ReactNode } from 'react';

import type { PermissionKey } from '../../shared/auth/permissions';
import AdminTab from '../features/admin/ui/AdminTab';
import BackupPanel from '../features/backup/ui/BackupPanel';
import ImportUsersTab from '../pages/ImportUsersTab';
import InstructionsTab from '../pages/InstrtuctionsTab';
import ManagerTab from '../pages/ManagerTab';
import ReportsTab from '../pages/ReportsTab';
import ShtatniPosadyTab from '../pages/ShtatniPosadyTab';
import type { TabKey } from './tabKeys';

export type { TabKey };

export type TabContext = {
    canAny: (...permissions: PermissionKey[]) => boolean;
    hasStaffingTable: boolean;
};

export type TabGroup = 'work' | 'system';

export type TabDefinition = {
    key: TabKey;
    label: (t: (key: string) => string) => string;
    /** Icon component; the shell decides size and colour. */
    icon: ReactNode;
    group: TabGroup;
    /** `null` = any signed-in user. Otherwise at least one permission is required. */
    requires: PermissionKey[] | null;
    /** Extra visibility condition that does not depend on permissions. */
    visibleWhen?: (context: TabContext) => boolean;
    render: () => ReactNode;
};

export const TAB_GROUPS: { key: TabGroup; labelKey: string }[] = [
    { key: 'work', labelKey: 'nav.groupWork' },
    { key: 'system', labelKey: 'nav.groupSystem' },
];

/**
 * Single registry of the main navigation. The shell (sidebar, title bar) and App read from
 * here, so adding a section (and its access rule) is one entry.
 */
export const TABS: TabDefinition[] = [
    {
        key: 'manager',
        label: (t) => t('nav.personnel'),
        icon: <Users />,
        group: 'work',
        requires: ['personnel.view'],
        render: () => <ManagerTab />,
    },
    {
        key: 'reports',
        label: (t) => t('nav.reports'),
        icon: <FileText />,
        group: 'work',
        requires: ['reports.view'],
        render: () => <ReportsTab />,
    },
    {
        key: 'importUsers',
        label: (t) => t('nav.tables'),
        icon: <Sheet />,
        group: 'work',
        requires: ['personnel.import', 'staffing.edit', 'tables.view'],
        render: () => <ImportUsersTab />,
    },
    {
        key: 'shtatni',
        label: (t) => t('nav.staffing'),
        icon: <ListTree />,
        group: 'work',
        requires: ['staffing.view'],
        visibleWhen: ({ hasStaffingTable }) => hasStaffingTable,
        render: () => <ShtatniPosadyTab />,
    },
    {
        key: 'backups',
        label: (t) => t('nav.backups'),
        icon: <DatabaseBackup />,
        group: 'system',
        requires: ['backup.export', 'backup.import', 'sync.export', 'sync.import', 'system.reset'],
        render: () => <BackupPanel />,
    },
    {
        key: 'admin',
        label: (t) => t('nav.admin'),
        icon: <ShieldCheck />,
        group: 'system',
        requires: ['accounts.manage', 'roles.manage', 'audit.view', 'security.manage'],
        render: () => <AdminTab />,
    },
    {
        key: 'instructions',
        label: (t) => t('nav.help'),
        icon: <LifeBuoy />,
        group: 'system',
        requires: null,
        render: () => <InstructionsTab />,
    },
];

export function visibleTabs(context: TabContext): TabDefinition[] {
    return TABS.filter(
        (tab) =>
            (tab.requires === null || context.canAny(...tab.requires)) &&
            (tab.visibleWhen?.(context) ?? true),
    );
}
