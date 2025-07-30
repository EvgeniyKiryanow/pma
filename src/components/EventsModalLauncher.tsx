import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import type { User } from '../types/user';

// 💡 Event modal with built-in tabs
function EventsModal({
    tabs,
    onClose,
}: {
    tabs: {
        key: string;
        label: string;
        items: { id: number; name: string; dateLabel: string; age?: number }[];
    }[];
    onClose: () => void;
}) {
    const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? '');
    const currentTab = tabs.find((tab) => tab.key === activeTab);

    return (
       <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
    <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl border relative transform transition-all duration-300 scale-100 opacity-100 animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Події</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Оновлення станом на {new Date().toLocaleDateString('uk-UA')}. Перевірте важливі події.
                </p>
            </div>
            <button
                onClick={onClose}
                className="text-gray-400 hover:text-red-600 text-2xl font-bold transition px-2"
                aria-label="Закрити"
            >
                ✕
            </button>
        </div>

        {/* Tabs */}
        <div className="mt-5 px-6">
            <div className="flex border-b border-gray-200">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 text-sm font-medium transition-all duration-200 relative ${
                            tab.key === activeTab
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-blue-600'
                        }`}
                    >
                        {tab.label}
                        <span className="ml-1 text-xs text-gray-400">({tab.items.length})</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
            {currentTab?.items.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-8 text-center">Подій не знайдено.</p>
            ) : (
                <ul className="space-y-4">
                    {currentTab?.items.map((item) => (
                        <li
                            key={item.id}
                            className="flex justify-between items-start p-3 border rounded-lg hover:shadow-sm transition bg-gray-50"
                        >
                            <div className="flex flex-col">
                                <span className="text-base font-medium text-gray-800">{item.name}</span>
                                <span className="text-xs text-gray-500 mt-1">
                                    {item.age !== undefined
                                        ? `🎂 ${item.dateLabel} — виповнюється ${item.age} років`
                                        : `📌 ${item.dateLabel}`}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    </div>
</div>

    );
}

export default function EventsModalLauncher() {
    const [showModal, setShowModal] = useState(false);
    const [birthdayItems, setBirthdayItems] = useState<
        { id: number; name: string; dateLabel: string; age: number }[]
    >([]);

    useEffect(() => {
        const loadEvents = async () => {
            const users: User[] = await window.electronAPI.fetchUsers();
            const today = new Date();
            const year = today.getFullYear();

            const birthdayList = users
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

            setBirthdayItems(birthdayList);
        };

        loadEvents();
    }, []);

    const totalCount = birthdayItems.length;

    if (totalCount === 0) return null;

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border border-yellow-300 shadow-sm animate-pulse font-semibold transition"
                title="Найближчі події"
            >
                <Gift className="w-4 h-4" />
                Події ({totalCount})
            </button>

            {showModal && (
                <EventsModal
                    tabs={[
                        {
                            key: 'birthdays',
                            label: 'Дні народження',
                            items: birthdayItems,
                        },
                        // Add more types in the future:
                        // {
                        //     key: 'orders',
                        //     label: 'Розпорядження',
                        //     items: [],
                        // },
                    ]}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}
