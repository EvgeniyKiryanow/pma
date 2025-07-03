import './index.css';
import { useEffect } from 'react';
import Header from './layout/Header';
import LeftBar from './layout/LeftBar';
import RightBar from './layout/RightBar';
import UserFormModalUpdate from './components/userFormModal';
import { useUserStore } from './stores/userStore';

export default function App() {
    const {
        users,
        selectedUser,
        setSelectedUser,
        fetchUsers,
        isUserFormOpen,
        editingUser,
        closeUserForm,
    } = useUserStore();

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <LeftBar users={users} selectedUser={selectedUser} onSelectUser={setSelectedUser} />
                <RightBar user={selectedUser} />
            </div>

            {/* ⬇️ Mount the modal here so it can show globally */}
            {isUserFormOpen && (
                <UserFormModalUpdate userToEdit={editingUser} onClose={closeUserForm} />
            )}
        </div>
    );
}
