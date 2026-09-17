import { Gift } from 'lucide-react';
import pLimit from 'p-limit';
import { useEffect, useState } from 'react';

import { useSessionStore } from '../../stores/sessionStore';
import { StatusExcel } from '../utils/excelUserStatuses';

function EventsModal({
    tabs,
    onClose,
}: {
    tabs: {
        key: string;
        label: string;
        items: { id: number; name: string; dateLabel: string; age?: number; daysLeft?: number }[];
    }[];
    onClose: () => void;
}) {
    const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? '');
    const currentTab = tabs.find((tab) => tab.key === activeTab);

    const tabDescriptions: Record<string, string> = {
        birthdays: 'Перелік військовослужбовців, у яких день народження протягом 7 днів.',
        orders: 'Розпорядження, термін дії яких завершується найближчим часом.',
        'ending-status':
            'Солдати, у яких завтра завершується поточний статус (наприклад, ВЛК, шпиталь тощо).',
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border relative transform transition-all duration-300 scale-100 opacity-100 animate-fade-in overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-6 pb-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">🔔 Важливі події</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Станом на {new Date().toLocaleDateString('uk-UA')} — перевірте, що
                                потребує уваги.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-red-500 text-2xl font-bold px-2 transition"
                            aria-label="Закрити"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-4">
                    <div className="flex space-x-3 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                                    tab.key === activeTab
                                        ? 'bg-blue-100 text-blue-700 shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {tab.label}
                                <span className="ml-1 text-xs text-gray-400">
                                    ({tab.items.length})
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Description */}
                <div className="px-6 pt-3">
                    <p className="text-sm text-gray-500 italic">
                        {tabDescriptions[activeTab] ?? 'Інформація про цю категорію.'}
                    </p>
                </div>

                {/* Content */}
                <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
                    {currentTab?.items.length === 0 ? (
                        <p className="text-sm text-gray-400 italic py-12 text-center">
                            Подій не знайдено для цієї категорії.
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {currentTab.items.map((item: any) => (
                                <li
                                    key={item.id}
                                    className="flex justify-between items-start p-4 border rounded-xl bg-white hover:bg-blue-50 shadow-sm transition"
                                >
                                    <div className="flex flex-col space-y-1">
                                        <span className="text-base font-semibold text-gray-900">
                                            {item.name}
                                        </span>

                                        {item.soldierStatus && (
                                            <span className="inline-block text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 w-fit font-medium">
                                                {item.soldierStatus}
                                            </span>
                                        )}

                                        <span className="text-xs text-gray-600">
                                            {item.age !== undefined
                                                ? `🎂 ${item.dateLabel} — виповнюється ${item.age} років`
                                                : item.daysLeft !== undefined
                                                  ? `📋 ${item.dateLabel} — залишилось ${item.daysLeft} дн.`
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
    const [birthdayItems, setBirthdayItems] = useState([]);
    const [orderItems, setOrderItems] = useState([]);
    const [endingStatusItems, setEndingStatusItems] = useState([]); // ✅ new tab
    const [entries, setEntries] = useState([]);

    async function fetchOrderEntriesFromDb() {
        // Birthdays and statuses still work for roles without access to orders.
        if (!useSessionStore.getState().can('directives.view')) return [];
        const raw = await window.electronAPI.directives.getAllByType('order');

        const parsed = raw.map((entry: any) => ({
            id: entry.id,
            userId: entry.userId,
            title: entry.title,
            description: entry.description ?? '',
            file: entry.file,
            date: entry.date,
            period: entry.period || { from: '', to: undefined },
        }));

        return parsed;
    }

    useEffect(() => {
        const loadEvents = async () => {
            const today = new Date();
            const year = today.getFullYear();
            const [users, orderEntries] = await Promise.all([
                window.electronAPI.fetchUsersMetadata(),
                fetchOrderEntriesFromDb(),
            ]);
            setEntries(orderEntries);

            const relevantStatuses = [
                StatusExcel.ABSENT_VLK,
                StatusExcel.ABSENT_HOSPITALIZED,
                StatusExcel.ABSENT_MEDICAL_COMPANY,
                StatusExcel.ABSENT_REHAB_LEAVE,
                StatusExcel.ABSENT_REHAB,
                StatusExcel.ABSENT_BUSINESS_TRIP,
                StatusExcel.ABSENT_SZO,
                StatusExcel.ABSENT_WOUNDED,
            ];

            const limit = pLimit(5); // limit to 5 parallel calls

            const usersWithRelevantStatus = users.filter((user: any) =>
                relevantStatuses.includes(user.soldierStatus?.trim() as StatusExcel),
            );

            const endingStatus: {
                id: number;
                name: string;
                dateLabel: string;
                daysLeft: number;
                soldierStatus?: string;
            }[] = [];

            await Promise.all(
                usersWithRelevantStatus.map((user: any) =>
                    limit(async () => {
                        const history: any[] = await window.electronAPI.getUserHistory(
                            user.id,
                            'all',
                        );

                        const matching = history
                            .filter(
                                (h) =>
                                    h.type === 'statusChange' &&
                                    h.description?.includes(`→ "${user.soldierStatus}"`),
                            )
                            .sort(
                                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
                            );

                        if (matching.length === 0) return;

                        const latest = matching[0];

                        const toDate = new Date(latest.period?.to);
                        const diffDays = Math.floor(
                            (toDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                        );

                        if (diffDays < -3 || diffDays > 7) return;

                        endingStatus.push({
                            id: user.id,
                            name: user.fullName,
                            dateLabel: toDate.toLocaleDateString('uk-UA'),
                            daysLeft: diffDays,
                            soldierStatus: user.soldierStatus,
                        });
                    }),
                ),
            );

            setEndingStatusItems(endingStatus);

            // 🎂 Birthdays
            const birthdayList = users
                .filter(
                    (user: any) =>
                        user.dateOfBirth &&
                        user.shpkNumber !== 'excluded' &&
                        !String(user.shpkNumber).includes('order'),
                )
                .map((user: any) => {
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
                .filter((u: any) => u.diffDays >= 0 && u.diffDays <= 7)
                .map((entry: any) => ({
                    id: entry.user.id,
                    name: entry.user.fullName,
                    dateLabel: entry.dateLabel,
                    age: entry.age,
                }));

            setBirthdayItems(birthdayList);

            // 📋 Orders (розпорядження)
            // const today = new Date();

            const orderList = orderEntries
                .map((entry) => {
                    const user = users.find((u: any) => u.id === entry.userId);
                    if (!user || !entry.period?.to) return null;

                    const endDate = new Date(entry.period.to);
                    const diffDays = Math.floor(
                        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                    );

                    // Show if ends in 7 days ahead OR up to 3 days ago
                    if (diffDays < -3 || diffDays > 7) return null;

                    return {
                        id: user.id,
                        name: user.fullName,
                        dateLabel: endDate.toLocaleDateString('uk-UA'),
                        daysLeft: diffDays,
                    };
                })
                .filter(Boolean);

            setOrderItems(orderList as any[]);
        };

        loadEvents();
    }, []);

    const totalCount = birthdayItems.length + orderItems.length + endingStatusItems.length;
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
                    onClose={() => setShowModal(false)}
                    tabs={[
                        {
                            key: 'birthdays',
                            label: 'Дні народження',
                            items: birthdayItems,
                        },
                        {
                            key: 'orders',
                            label: 'Розпорядження',
                            items: orderItems,
                        },
                        {
                            key: 'ending-status',
                            label: 'Завершення статусу',
                            items: endingStatusItems,
                        },
                    ].filter((tab) => tab.items.length > 0)}
                />
            )}
        </>
    );
}
