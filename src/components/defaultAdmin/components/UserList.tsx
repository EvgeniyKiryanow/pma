import type { FullUser } from './types';
import UserCard from './UserCard';

export default function UserList({
    admins,
    users,
    savingId,
    generatingId,
    deletingId,
    onChangeUser,
    onSaveUser,
    onGenerateKey,
    onDeleteUser,
}: {
    admins: FullUser[];
    users: FullUser[];
    savingId: number | null;
    generatingId: number | null;
    deletingId: number | null;
    onChangeUser: (
        id: number,
        source: FullUser['source'],
        updater: (u: FullUser) => FullUser,
    ) => void;
    onSaveUser: (user: FullUser) => void;
    onGenerateKey: (user: FullUser) => void;
    onDeleteUser: (user: FullUser) => void;
}) {
    return (
        <>
            {admins.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-slate-600 mb-2">Default admin</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {admins.map((user) => (
                            <UserCard
                                key={`admin-${user.id}`}
                                user={user}
                                saving={savingId === user.id}
                                onChange={(updater) => onChangeUser(user.id, user.source, updater)}
                                onSave={() => onSaveUser(user)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div>
                <h4 className="text-sm font-semibold text-slate-600 mt-2 mb-2">
                    Звичайні користувачі
                </h4>
                {users.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                        Нікого не знайдено за цим фільтром
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {users.map((user) => (
                            <UserCard
                                key={`user-${user.id}`}
                                user={user}
                                saving={savingId === user.id}
                                generating={generatingId === user.id}
                                deleting={deletingId === user.id}
                                onChange={(updater) => onChangeUser(user.id, user.source, updater)}
                                onSave={() => onSaveUser(user)}
                                onGenerateKey={() => onGenerateKey(user)}
                                onDelete={() => onDeleteUser(user)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
