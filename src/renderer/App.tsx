import './styles/index.css';

import { useEffect, useMemo, useRef } from 'react';

import { useShtatniStore } from '../renderer/entities/shtatna-posada/model/useShtatniStore';
import { UnitStatsCalculator } from '../renderer/features/report/ui/_components/UnitStatsCalculator';
import { buildPlannedTotalsFromShtatni } from '../renderer/shared/utils/plannedTotalsFromShtatni';
import Header from './app/layout/Header';
import { visibleTabs } from './app/navigation';
import UserFormModalUpdate from './entities/user/ui/userFormModal';
import { useNamedListStore } from './features/report/model/useNamedListStore';
import { startNamedListAutoApply } from './features/report/ui/_components/NamedListTable';
import { usePermissions } from './stores/sessionStore';
import { useUserStore } from './stores/userStore';

export default function App() {
    const { can, canAny } = usePermissions();

    const currentTab = useUserStore((s) => s.currentTab);
    const setCurrentTab = useUserStore((s) => s.setCurrentTab);
    const users = useUserStore((s) => s.users);
    const fetchUsers = useUserStore((s) => s.fetchUsers);
    const selectedUser = useUserStore((s) => s.selectedUser);
    const setSelectedUser = useUserStore((s) => s.setSelectedUser);
    const isUserFormOpen = useUserStore((s) => s.isUserFormOpen);
    const editingUser = useUserStore((s) => s.editingUser);
    const closeUserForm = useUserStore((s) => s.closeUserForm);

    const loadAllTables = useNamedListStore((s) => s.loadAllTables);
    const loadedOnce = useNamedListStore((s) => s.loadedOnce);

    const shtatniPosady = useShtatniStore((s) => s.shtatniPosady);
    const fetchShtatni = useShtatniStore((s) => s.fetchAll);

    const canViewPersonnel = can('personnel.view');
    const canViewTables = can('tables.view');
    const canEditTables = can('tables.edit');
    const canViewStaffing = can('staffing.view');

    const autoApplyStarted = useRef(false);

    // Load only what the current role is allowed to read.
    useEffect(() => {
        if (canViewPersonnel) void fetchUsers();
        if (canViewTables) void loadAllTables();
        if (canViewStaffing) void fetchShtatni();
    }, [canViewPersonnel, canViewTables, canViewStaffing]);

    useEffect(() => {
        UnitStatsCalculator.setPlannedTotals(buildPlannedTotalsFromShtatni(shtatniPosady));
    }, [shtatniPosady]);

    // Fills today's named list column from soldier statuses (only for roles that may edit it).
    useEffect(() => {
        if (!canEditTables || autoApplyStarted.current || users.length === 0 || !loadedOnce) return;
        const stop = startNamedListAutoApply();
        autoApplyStarted.current = true;
        return () => {
            stop();
            autoApplyStarted.current = false;
        };
    }, [canEditTables, users.length, loadedOnce]);

    useEffect(() => {
        if (selectedUser && !users.find((u) => u.id === selectedUser.id)) {
            setSelectedUser(null);
        }
    }, [users]);

    const tabs = useMemo(
        () => visibleTabs({ canAny, hasStaffingTable: shtatniPosady.length > 0 }),
        [canAny, shtatniPosady.length],
    );
    const activeTab = tabs.find((tab) => tab.key === currentTab) ?? tabs[0];

    // Keep the stored tab in sync when the role no longer allows it.
    useEffect(() => {
        if (activeTab && activeTab.key !== currentTab) setCurrentTab(activeTab.key);
    }, [activeTab?.key, currentTab]);

    return (
        <div className="h-screen flex flex-col bg-gray-50 pt-[44px]">
            <Header
                tabs={tabs}
                currentTab={activeTab?.key ?? currentTab}
                setCurrentTab={setCurrentTab}
            />

            {activeTab?.render()}

            {isUserFormOpen && (
                <UserFormModalUpdate userToEdit={editingUser} onClose={closeUserForm} />
            )}
        </div>
    );
}
