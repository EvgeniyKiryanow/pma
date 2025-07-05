import { useState } from 'react';
import { useUserStore } from '../stores/userStore';
import type { User } from '../types/user';

type Props = {
  users: User[];
};

export default function LeftBar({ users }: Props) {
  const [filter, setFilter] = useState('');
  const selectedUser = useUserStore((s) => s.selectedUser);
  const setSelectedUser = useUserStore((s) => s.setSelectedUser);

  const filteredUsers = users.filter((user) => {
    const search = filter.toLowerCase();
    return (
      user.fullName.toLowerCase().includes(search) ||
      user.rank.toLowerCase().includes(search) ||
      user.id.toString().includes(search)
    );
  });

  return (
    <nav className="w-72 bg-white border-r border-gray-300 shadow-sm flex flex-col h-screen">
      <h2 className="text-xl font-semibold p-5 border-b border-gray-300 flex-shrink-0">
        <p>Personnel List</p>
        <p>Total Personnel: {filteredUsers.length}</p>
      </h2>
      <input
        type="text"
        placeholder="Search by name, rank, or ID..."
        className="m-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-300 flex-shrink-0"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <ul className="flex-1 overflow-y-auto pt-[5px]">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user, index) => (
            <li
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`flex items-center cursor-pointer p-4 border-b border-gray-200 hover:bg-blue-50 transition-colors duration-200 ${
                selectedUser?.id === user.id ? 'bg-blue-100 font-semibold' : ''
              }`}
            >
              <span className="mr-3 text-gray-500 w-6 text-right select-none">
                {index + 1}.
              </span>
              <img src={user.photo || ''} className="h-6 w-6 mr-2 rounded-full" alt="" />
              <span className="mr-2">{user.fullName}</span>
              <span className="text-sm text-gray-500 font-normal">({user.rank})</span>
            </li>
          ))
        ) : (
          <li className="p-4 text-gray-400 italic">No users found</li>
        )}
      </ul>
    </nav>
  );
}
