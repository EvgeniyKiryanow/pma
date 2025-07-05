import './index.css';
import { useEffect, useState } from 'react';
import Header from './layout/Header';
import LeftBar from './layout/LeftBar';
import RightBar from './layout/RightBar';
import UserFormModalUpdate from './components/userFormModal';
import type { User } from './types/user';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUserFormOpen, setUserFormOpen] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      const result = await window.electronAPI.fetchUsers();
      setUsers(result);
    };

    loadUsers();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LeftBar users={users} selectedUser={selectedUser} onSelectUser={setSelectedUser} />
        <RightBar user={selectedUser} />
      </div>

      {isUserFormOpen && (
        <UserFormModalUpdate userToEdit={editingUser} onClose={() => setUserFormOpen(false)} />
      )}
    </div>
  );
}
