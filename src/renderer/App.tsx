// src/App.tsx
import './styles/index.css';

import { useEffect, useRef } from 'react';

import { useShtatniStore } from '../renderer/entities/shtatna-posada/model/useShtatniStore';
import { UnitStatsCalculator } from '../renderer/features/report/ui/_components/UnitStatsCalculator';
import { buildPlannedTotalsFromShtatni } from '../renderer/shared/utils/plannedTotalsFromShtatni';
import Header from './app/layout/Header';
import UserFormModalUpdate from './entities/user/ui/userFormModal';
import BackupPanel from './features/backup/ui/BackupPanel';
import { useNamedListStore } from './features/report/model/useNamedListStore';
import { startNamedListAutoApply } from './features/report/ui/_components/NamedListTable';
import TablesTab from './features/report/ui/_components/TablesTab';
import ImportUsersTab from './pages/ImportUsersTab';
import InstructionsTab from './pages/InstrtuctionsTab';
import ManagerTab from './pages/ManagerTab';
import ReportsTab from './pages/ReportsTab';
import ShtatniPosadyTab from './pages/ShtatniPosadyTab';
import { useUserStore } from './stores/userStore';

export default function App() {
    const currentTab = useUserStore((s) => s.currentTab);
    const setCurrentTab = useUserStore((s) => s.setCurrentTab);

    // ✅ get allowed tabs from store (persisted after login)
    const allowedTabs = useUserStore((s) => s.allowedTabs);

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

    const autoApplyStarted = useRef(false);

    useEffect(() => {
        fetchUsers();
        loadAllTables();
        fetchShtatni();
    }, []);

    useEffect(() => {
        const planned = buildPlannedTotalsFromShtatni(shtatniPosady);
        UnitStatsCalculator.setPlannedTotals(planned);
    }, [shtatniPosady]);

    useEffect(() => {
        if (!autoApplyStarted.current && users.length > 0 && loadedOnce) {
            const stop = startNamedListAutoApply();
            autoApplyStarted.current = true;
            return () => {
                stop();
                autoApplyStarted.current = false;
            };
        }
    }, [users.length, loadedOnce]);

    useEffect(() => {
        if (selectedUser && !users.find((u) => u.id === selectedUser.id)) {
            setSelectedUser(null);
        }
    }, [users]);

    // 🚧 HARD GUARD: if the current tab is not allowed, jump to the first allowed tab
    useEffect(() => {
        if (allowedTabs && allowedTabs.length > 0) {
            if (!allowedTabs.includes(currentTab as any)) {
                setCurrentTab(allowedTabs[0] as any);
            }
        }
    }, [currentTab, allowedTabs.join(',')]); // join to trigger when content changes

    // optional: block rendering of a forbidden tab during the tiny redirect window
    const canView = allowedTabs.length === 0 || allowedTabs.includes(currentTab as any);

    return (
        <div className="h-screen flex flex-col bg-gray-50 pt-[44px]">
            <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

            {/* small guard while redirecting */}
            {!canView ? (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                    Перенаправлення…
                </div>
            ) : currentTab === 'manager' ? (
                <div className="flex flex-1 overflow-hidden">
                    <ManagerTab />
                </div>
            ) : currentTab === 'backups' ? (
                <BackupPanel />
            ) : currentTab === 'reports' ? (
                <ReportsTab />
            ) : currentTab === 'tables' ? (
                <TablesTab />
            ) : currentTab === 'importUsers' ? (
                <ImportUsersTab />
            ) : currentTab === 'shtatni' ? (
                <ShtatniPosadyTab />
            ) : currentTab === 'instructions' ? (
                <InstructionsTab />
            ) : null}

            {isUserFormOpen && (
                <UserFormModalUpdate userToEdit={editingUser} onClose={closeUserForm} />
            )}
        </div>
    );
}
