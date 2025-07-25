import { X, BarChart2, Clock } from 'lucide-react';
import type { User } from '../types/user';

type Props = {
    user: User;
    onClose: () => void;
};

export default function UserStatisticsDrawer({ user, onClose }: Props) {
    if (!user) return null;

    // Filter only statusChange entries
    const statusHistory = (user.history || []).filter((h) => h.type === 'statusChange');

    // Sort by date descending
    statusHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalChanges = statusHistory.length;

    // Calculate average time between changes
    let avgTimeBetweenChanges = null;
    if (statusHistory.length > 1) {
        let totalDiff = 0;
        for (let i = 0; i < statusHistory.length - 1; i++) {
            const diff =
                new Date(statusHistory[i].date).getTime() -
                new Date(statusHistory[i + 1].date).getTime();
            totalDiff += diff;
        }
        const avgMs = totalDiff / (statusHistory.length - 1);
        const avgDays = Math.round(avgMs / (1000 * 60 * 60 * 24));
        avgTimeBetweenChanges = avgDays;
    }

    return (
        <div className="fixed top-0 right-0 h-full w-[30%] min-w-[320px] bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col animate-slide-in">
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b bg-gradient-to-r from-purple-50 to-purple-100">
                <h2 className="text-lg font-bold text-purple-800 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5" /> Статистика
                </h2>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-red-500 transition"
                    title="Закрити"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Summary */}
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 shadow-sm">
                    <p className="text-sm text-gray-700">
                        Загальна кількість змін статусу:{' '}
                        <span className="font-semibold text-purple-800">{totalChanges}</span>
                    </p>

                    {avgTimeBetweenChanges !== null && (
                        <p className="text-sm text-gray-700 mt-1 flex items-center gap-1">
                            <Clock className="w-4 h-4 text-purple-600" />
                            Середній час між змінами:{' '}
                            <span className="font-semibold text-purple-800">
                                {avgTimeBetweenChanges} днів
                            </span>
                        </p>
                    )}
                </div>

                {/* List of changes */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Історія змін:</h3>
                    {statusHistory.length === 0 ? (
                        <p className="text-gray-400 italic">Змін статусу немає</p>
                    ) : (
                        <ul className="space-y-3">
                            {statusHistory.map((h) => {
                                const match = h.description?.match(/"(.+?)"\s*→\s*"(.+?)"/);
                                const prev = match ? match[1] : '—';
                                const next = match ? match[2] : '—';

                                return (
                                    <li
                                        key={h.id}
                                        className="p-3 rounded-md border border-gray-200 bg-gray-50 shadow-sm"
                                    >
                                        <p className="text-sm font-medium text-gray-800">
                                            {new Date(h.date).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            <span className="font-semibold">{prev}</span> →{' '}
                                            <span className="font-semibold text-green-700">
                                                {next}
                                            </span>
                                        </p>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
