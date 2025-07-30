import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import type { User } from '../types/user';

// Animated and informative Events Modal
function EventsModal({
    title,
    items,
    onClose,
}: {
    title: string;
    items: { id: number; name: string; dateLabel: string; age: number }[];
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-xl border relative transform transition-all duration-300 scale-100 opacity-100 animate-fade-in">
                <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>

                <ul className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="flex justify-between items-center text-sm text-gray-800 border-b pb-2"
                        >
                            <div className="flex flex-col">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-xs text-gray-500">
                                    🎂 {item.dateLabel} — виповнюється {item.age} років
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>

                <button
                    onClick={onClose}
                    className="absolute top-3 right-4 text-gray-400 hover:text-red-600 text-xl font-bold"
                    aria-label="Закрити"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

export default function EventsModalLauncher() {
    const [eventItems, setEventItems] = useState<
        { id: number; name: string; dateLabel: string; age: number }[]
    >([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const loadEvents = async () => {
            const users: User[] = await window.electronAPI.fetchUsers();
            const today = new Date();
            const year = today.getFullYear();

            const items = users
                .filter(
                    (user) =>
                        user.dateOfBirth &&
                        user.shpkNumber !== 'excluded' &&
                        !String(user.shpkNumber).includes('order'),
                )
                .map((user) => {
                    const dob = new Date(user.dateOfBirth!);
                    const next = new Date(year, dob.getMonth(), dob.getDate());
                    if (next < today) next.setFullYear(year + 1);

                    const age = next.getFullYear() - dob.getFullYear();

                    const diffDays = Math.floor(
                        (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                    );

                    return {
                        user,
                        age,
                        diffDays,
                        dateLabel: `${next.getDate().toString().padStart(2, '0')}.${(
                            next.getMonth() + 1
                        )
                            .toString()
                            .padStart(2, '0')}`,
                    };
                })
                .filter((u) => u.diffDays >= 0 && u.diffDays <= 7)
                .map((entry) => ({
                    id: entry.user.id,
                    name: entry.user.fullName,
                    dateLabel: entry.dateLabel,
                    age: entry.age,
                }));

            setEventItems(items);
        };

        loadEvents();
    }, []);

    if (eventItems.length === 0) return null;

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border border-yellow-300 transition shadow-sm"
                title="Найближчі події"
            >
                <Gift className="w-4 h-4" />
                Події ({eventItems.length})
            </button>

            {showModal && (
                <EventsModal
                    title="Найближчі дні народження"
                    items={eventItems}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}
