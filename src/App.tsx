import './index.css';
import { useEffect, useState } from 'react';
import Header from './layout/Header';
import LeftBar from './layout/LeftBar';
import RightBar from './layout/RightBar';
import UserFormModalUpdate from './components/userFormModal';
import { useUserStore } from './stores/userStore';
import type { User } from './types/user';

export default function App() {
    const {
        fetchUsers,
        users,
        isUserFormOpen,
        editingUser,
        closeUserForm,
        setSelectedUser,
        selectedUser,
    } = useUserStore();

    useEffect(() => {
        fetchUsers(); // Load users from SQLite via Electron API
    }, [fetchUsers]);

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <LeftBar users={users} selectedUser={selectedUser} onSelectUser={setSelectedUser} />
                <RightBar user={selectedUser} />
            </div>

            {isUserFormOpen && (
                <UserFormModalUpdate userToEdit={editingUser} onClose={closeUserForm} />
            )}
        </div>
    );
}
