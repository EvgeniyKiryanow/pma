import {
    BookText,
    DatabaseBackup,
    FileBarChart,
    FileSpreadsheet,
    ShieldCheck,
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

export type TabDefinition = {
    key: TabKey;
    label: (t: (key: string) => string) => string;
    icon: ReactNode;
    /** `null` = any signed-in user. Otherwise at least one permission is required. */
    requires: PermissionKey[] | null;
    /** Extra visibility condition that does not depend on permissions. */
    visibleWhen?: (context: TabContext) => boolean;
    render: () => ReactNode;
};

/**
 * Single registry of the main navigation. Header and App both read from here, so adding
 * a tab (and its access rule) is one entry.
 */
export const TABS: TabDefinition[] = [
    {
        key: 'manager',
        label: (t) => t('header.managerTab'),
        icon: <Users className="h-4 w-4" />,
        requires: ['personnel.view'],
        render: () => (
            <div className="flex flex-1 overflow-hidden">
                <ManagerTab />
            </div>
        ),
    },
    {
        key: 'reports',
        label: (t) => t('header.reportsTab'),
        icon: <FileBarChart className="h-4 w-4" />,
        requires: ['reports.view'],
        render: () => <ReportsTab />,
    },
    {
        key: 'backups',
        label: (t) => t('header.backupTab'),
        icon: <DatabaseBackup className="h-4 w-4" />,
        requires: ['backup.export', 'backup.import', 'sync.export', 'sync.import', 'system.reset'],
        render: () => <BackupPanel />,
    },
    {
        key: 'importUsers',
        label: () => 'Excel',
        icon: <FileSpreadsheet className="h-4 w-4" />,
        requires: ['personnel.import', 'staffing.edit', 'tables.view'],
        render: () => <ImportUsersTab />,
    },
    {
        key: 'shtatni',
        label: () => 'БЧС',
        icon: <FileSpreadsheet className="h-4 w-4" />,
        requires: ['staffing.view'],
        visibleWhen: ({ hasStaffingTable }) => hasStaffingTable,
        render: () => <ShtatniPosadyTab />,
    },
    {
        key: 'instructions',
        label: (t) => t('header.instructions'),
        icon: <BookText className="h-4 w-4" />,
        requires: null,
        render: () => <InstructionsTab />,
    },
    {
        key: 'admin',
        label: (t) => t('nav.admin'),
        icon: <ShieldCheck className="h-4 w-4" />,
        requires: ['accounts.manage', 'roles.manage', 'audit.view'],
        render: () => <AdminTab />,
    },
];

export function visibleTabs(context: TabContext): TabDefinition[] {
    return TABS.filter(
        (tab) =>
            (tab.requires === null || context.canAny(...tab.requires)) &&
            (tab.visibleWhen?.(context) ?? true),
    );
}
