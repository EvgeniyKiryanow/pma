// components/UserList.tsx
import type { User } from '../../../../../types/user';
import { useReportsStore } from '../../../report/model/reportsStore';

type Props = {
    users: User[];
    selectedUserId: string | number | null;
    searchUser1: string;
    setSearchUser1: (value: string) => void;
    searchUser2: string;
    setSearchUser2: (value: string) => void;
};

export default function UserList({
    users,
    selectedUserId,
    searchUser1,
    setSearchUser1,
    searchUser2,
    setSearchUser2,
}: Props) {
    const setSelectedUser = useReportsStore((s) => s.setSelectedUser);
    const selectedUserId2 = useReportsStore((s) => s.selectedUserId2);
    const setSelectedUser2 = useReportsStore((s) => s.setSelectedUser2);

    return (
        <div>
            {/* First User */}
            <div className="border rounded-lg p-3 bg-white shadow-sm mb-4">
                <h3 className="text-md font-semibold mb-3 text-gray-800 border-b pb-2">
                    Обрати користувача
                </h3>

                <input
                    type="text"
                    placeholder="🔍 Пошук користувача..."
                    className="w-full mb-3 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={searchUser1}
                    onChange={(e) => setSearchUser1(e.target.value)}
                />

                <ul className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                    {users
                        .filter((u) => u.fullName.toLowerCase().includes(searchUser1.toLowerCase()))
                        .map((u) => (
                            <li
                                key={u.id}
                                onClick={() =>
                                    setSelectedUser(selectedUserId === u.id ? null : u.id)
                                }
                                className={`cursor-pointer px-3 py-2 rounded-md border transition text-sm ${
                                    selectedUserId === u.id
                                        ? 'bg-blue-100 border-blue-400 font-medium'
                                        : 'hover:bg-blue-50 border-gray-200'
                                }`}
                            >
                                👤 {u.fullName}
                            </li>
                        ))}
                </ul>
            </div>

            {/* Second User */}
            {/* <div className="border rounded-lg p-3 bg-white shadow-sm">
                <h3 className="text-md font-semibold mb-3 text-gray-800 border-b pb-2">
                    Обрати другого користувача
                </h3>

                <input
                    type="text"
                    placeholder="🔍 Пошук другого користувача..."
                    className="w-full mb-3 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-green-300"
                    value={searchUser2}
                    onChange={(e) => setSearchUser2(e.target.value)}
                />

                <ul className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                    {users
                        .filter((u) => u.fullName.toLowerCase().includes(searchUser2.toLowerCase()))
                        .map((u) => (
                            <li
                                key={u.id}
                                onClick={() =>
                                    setSelectedUser2(selectedUserId2 === u.id ? null : u.id)
                                }
                                className={`cursor-pointer px-3 py-2 rounded-md border transition text-sm ${
                                    selectedUserId2 === u.id
                                        ? 'bg-green-100 border-green-400 font-medium'
                                        : 'hover:bg-green-50 border-gray-200'
                                }`}
                            >
                                👥 {u.fullName}
                            </li>
                        ))}
                </ul>
            </div> */}
        </div>
    );
}
{
    /* <div className="border rounded-lg p-3 bg-white shadow-sm mb-4">
                    <h3 className="text-md font-semibold mb-3 text-gray-800 border-b pb-2">
                        {t('reports.selectUser')}
                    </h3>

                    <input
                        type="text"
                        placeholder="🔍 Пошук користувача..."
                        className="w-full mb-3 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                        value={searchUser1}
                        onChange={(e) => setSearchUser1(e.target.value)}
                    />

                    <ul className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                        {users
                            .filter((u) =>
                                u.fullName.toLowerCase().includes(searchUser1.toLowerCase()),
                            )
                            .map((u) => (
                                <li
                                    key={u.id}
                                    onClick={() =>
                                        setSelectedUser(selectedUserId === u.id ? null : u.id)
                                    }
                                    className={`cursor-pointer px-3 py-2 rounded-md border transition text-sm ${
                                        selectedUserId === u.id
                                            ? 'bg-blue-100 border-blue-400 font-medium'
                                            : 'hover:bg-blue-50 border-gray-200'
                                    }`}
                                >
                                    👤 {u.fullName}
                                </li>
                            ))}
                    </ul>
                </div>

                <div className="border rounded-lg p-3 bg-white shadow-sm">
                    <h3 className="text-md font-semibold mb-3 text-gray-800 border-b pb-2">
                        Обрати другого користувача
                    </h3>

                    <input
                        type="text"
                        placeholder="🔍 Пошук другого користувача..."
                        className="w-full mb-3 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-green-300"
                        value={searchUser2}
                        onChange={(e) => setSearchUser2(e.target.value)}
                    />

                    <ul className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                        {users
                            .filter((u) =>
                                u.fullName.toLowerCase().includes(searchUser2.toLowerCase()),
                            )
                            .map((u) => (
                                <li
                                    key={u.id}
                                    onClick={() => {
                                        const currentId =
                                            useReportsStore.getState().selectedUserId2;
                                        useReportsStore
                                            .getState()
                                            .setSelectedUser2(currentId === u.id ? null : u.id);
                                    }}
                                    className={`cursor-pointer px-3 py-2 rounded-md border transition text-sm ${
                                        useReportsStore.getState().selectedUserId2 === u.id
                                            ? 'bg-green-100 border-green-400 font-medium'
                                            : 'hover:bg-green-50 border-gray-200'
                                    }`}
                                >
                                    👥 {u.fullName}
                                </li>
                            ))}
                    </ul>
                </div> */
}
