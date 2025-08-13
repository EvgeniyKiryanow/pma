import './index.css';

import { useEffect, useRef } from 'react';

import UserFormModalUpdate from './components/userFormModal';
import TablesTab from './components/userTables/TablesTab';
import Header from './renderer/app/layout/Header';
import BackupPanel from './renderer/features/backup/ui/BackupPanel';
import { startNamedListAutoApply } from './renderer/features/report/ui/_components/NamedListTable';
import ImportUsersTab from './renderer/pages/ImportUsersTab';
import InstructionsTab from './renderer/pages/InstrtuctionsTab';
import ManagerTab from './renderer/pages/ManagerTab';
import ReportsTab from './renderer/pages/ReportsTab';
import ShtatniPosadyTab from './renderer/pages/ShtatniPosadyTab';
import { useUserStore } from './renderer/stores/userStore';
import { useNamedListStore } from './stores/useNamedListStore';

export default function App() {
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
    const autoApplyStarted = useRef(false);
    useEffect(() => {
        fetchUsers();
        loadAllTables();
    }, []);

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

    return (
        <div className="h-screen flex flex-col bg-gray-50 pt-[44px]">
            <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />
            {currentTab === 'manager' ? (
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
