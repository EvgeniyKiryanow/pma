import './index.css';
import { useEffect } from 'react';
import Header from './layout/Header';
import LeftBar from './layout/LeftBar';
import RightBar from './layout/RightBar';
import UserFormModalUpdate from './components/userFormModal';
import { useUserStore } from './stores/userStore';
import BackupPanel from './layout/BackupPanel';
import RemindersTab from './components/RemindersTab';

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

    useEffect(() => {
        fetchUsers();
    }, []);

    // Deselect user if it was removed
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
                <LeftBar users={users} />
                <RightBar />
            </div>
        ) : currentTab === 'backups' ? (
            <BackupPanel />
        ) : currentTab === 'reminders' ? (
            <RemindersTab />
        ) : null}
        {isUserFormOpen && (
            <UserFormModalUpdate userToEdit={editingUser} onClose={closeUserForm} />
        )}
    </div>
);

}
