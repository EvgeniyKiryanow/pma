import './index.css';
import { useEffect, useState } from 'react';
import Header from './layout/Header';
import LeftBar from './layout/LeftBar';
import RightBar from './layout/RightBar';
import UserFormModalUpdate from './components/userFormModal';
import { useUserStore } from './stores/userStore';
import type { User } from './types/user';
import BackupControls from './layout/BackupControls';
import BackupPanel from './components/BackupPanel';

export default function App() {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [currentTab, setCurrentTab] = useState<'manager' | 'backups'>('manager');

    const isUserFormOpen = useUserStore((s) => s.isUserFormOpen);
    const editingUser = useUserStore((s) => s.editingUser);
    const closeUserForm = useUserStore((s) => s.closeUserForm);

    useEffect(() => {
        const loadUsers = async () => {
            const result = await window.electronAPI.fetchUsers();
            setUsers(result);
        };

        loadUsers();
    }, []);

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

            {currentTab === 'manager' ? (
                <div className="flex flex-1 overflow-hidden">
                    <LeftBar users={users} selectedUser={selectedUser} onSelectUser={setSelectedUser} />
                    <RightBar user={selectedUser} />
                </div>
            ) : (
                <BackupPanel />
            )}

            {isUserFormOpen && (
                <UserFormModalUpdate userToEdit={editingUser} onClose={closeUserForm} />
            )}
        </div>
    );
}
