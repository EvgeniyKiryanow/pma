import { useEffect, useState } from 'react';

type User = {
    id: number;
    username: string;
    role: string;
};

export default function UserManagementTab() {
    const [users, setUsers] = useState<User[]>([]);

    // const fetchUsers = async () => {
    //     const result = await window.electronAPI.getAllAuthUsers?.();
    //     if (Array.isArray(result)) {
    //         setUsers(result);
    //     }
    // };

    // useEffect(() => {
    //     fetchUsers();
    // }, []);

    return (
        <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-700">User Management</h2>
            <table className="w-full table-auto border-collapse">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border px-4 py-2 text-left">Username</th>
                        <th className="border px-4 py-2 text-left">Role</th>
                    </tr>
                </thead>
                {/* <tbody>
                    {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                            <td className="border px-4 py-2">{user.username}</td>
                            <td className="border px-4 py-2">{user.role}</td>
                        </tr>
                    ))}
                </tbody> */}
            </table>
        </div>
    );
}
