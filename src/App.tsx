import './index.css';
import { useEffect, useRef } from 'react';
import Header from './layout/Header';
import UserFormModalUpdate from './components/userFormModal';
import { useUserStore } from './stores/userStore';
import BackupPanel from './layout/BackupPanel';
import ReportsTab from './layout/ReportsTab';
import TablesTab from './components/userTables/TablesTab';
import InstructionsTab from './layout/InstrtuctionsTab';
import ImportUsersTab from './layout/ImportUsersTab';
import ShtatniPosadyTab from './layout/ShtatniPosadyTab';
import ManagerTab from './layout/ManagerTab';
import { startNamedListAutoApply } from './autoApplyNamedListStatuses';
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
