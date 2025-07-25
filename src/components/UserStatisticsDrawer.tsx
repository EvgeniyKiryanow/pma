import { X, BarChart2, Clock, ArrowRight } from 'lucide-react';
import type { User } from '../types/user';
import { useEffect, useState } from 'react';

type Props = {
    user: User;
    onClose: () => void;
};

export default function UserStatisticsDrawer({ user, onClose }: Props) {
    if (!user) return null;

    const statusHistory = (user.history || []).filter((h) => h.type === 'statusChange');
    statusHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalChanges = statusHistory.length;

    // ✅ Avg time between changes
    let avgTimeDays: number | null = null;
    if (totalChanges > 1) {
        let totalDiffMs = 0;
        for (let i = 0; i < totalChanges - 1; i++) {
            totalDiffMs +=
                new Date(statusHistory[i + 1].date).getTime() -
                new Date(statusHistory[i].date).getTime();
        }
        avgTimeDays = Math.max(
            1,
            Math.round(totalDiffMs / (totalChanges - 1) / (1000 * 60 * 60 * 24)),
        );
    }

    type Period = { status: string; start: Date; end: Date };

    const cleanedPeriods: Period[] = [];
    for (let i = 0; i < statusHistory.length; i++) {
        const match = statusHistory[i].description?.match(/"(.+?)"\s*→\s*"(.+?)"/);
        const newStatus = match ? match[2] : null;
        if (!newStatus) continue;
        const start = new Date(statusHistory[i].date);
        const nextChangeDate =
            i < statusHistory.length - 1 ? new Date(statusHistory[i + 1].date) : new Date();
        cleanedPeriods.push({ status: newStatus, start, end: nextChangeDate });
    }

    // ✅ Merge same-day usage
    const mergedDayUsage: Record<
        string,
        { uniqueDays: Set<string>; periods: { start: Date; end: Date }[] }
    > = {};
    cleanedPeriods.forEach((period) => {
        const dayKey = period.start.toISOString().split('T')[0];
        if (!mergedDayUsage[period.status]) {
            mergedDayUsage[period.status] = { uniqueDays: new Set(), periods: [] };
        }
        mergedDayUsage[period.status].uniqueDays.add(dayKey);
        mergedDayUsage[period.status].periods.push({ start: period.start, end: period.end });
    });

    const groupedArray = Object.entries(mergedDayUsage)
        .map(([status, info]) => ({
            status,
            uniqueDays: info.uniqueDays.size,
            periods: info.periods,
        }))
        .sort((a, b) => b.uniqueDays - a.uniqueDays);

    const mostFrequentStatus = groupedArray[0]?.status || '—';
    const mostFrequentDays = groupedArray[0]?.uniqueDays || 0;

    const lastStatus =
        cleanedPeriods.length > 0
            ? cleanedPeriods[cleanedPeriods.length - 1].status
            : user.soldierStatus || '—';
    const lastStatusDate =
        cleanedPeriods.length > 0
            ? cleanedPeriods[cleanedPeriods.length - 1].start.toLocaleDateString()
            : '—';

    return (
        <>
            {/* ✅ FULLSCREEN OVERLAY */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

            {/* ✅ CENTER FLOATING ICON (PULSING WHILE OPEN) */}
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                <div className="relative flex flex-col items-center">
                    {/* glowing circle */}
                    <div className="absolute w-24 h-24 rounded-full bg-purple-500 opacity-20 animate-ping" />
                    {/* icon */}
                    <div className="p-6 rounded-full bg-white shadow-xl animate-bounce-slow">
                        <BarChart2 className="w-12 h-12 text-purple-600" />
                    </div>
                    <span className="mt-2 text-sm text-white font-medium shadow-lg">
                        Аналіз статистики…
                    </span>
                </div>
            </div>

            {/* ✅ SLIDE-IN DRAWER */}
            <div className="fixed top-0 right-0 h-full w-[30%] min-w-[340px] bg-white shadow-2xl border-l border-gray-200 z-60 flex flex-col animate-slide-in">
                {/* HEADER */}
                <div className="flex justify-between items-center px-5 py-4 border-b bg-gradient-to-r from-purple-50 to-purple-100">
                    <h2 className="text-lg font-bold text-purple-800 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5" /> Статистика користувача
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-red-500 transition"
                        title="Закрити"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* === SUMMARY === */}
                    <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 shadow-sm space-y-2">
                        <p className="text-sm text-gray-700">
                            Загальна кількість змін статусу:{' '}
                            <span className="font-semibold text-purple-800">{totalChanges}</span>
                        </p>

                        {avgTimeDays !== null && (
                            <p className="text-sm text-gray-700 flex items-center gap-1">
                                <Clock className="w-4 h-4 text-purple-600" />
                                Середній час між змінами:{' '}
                                <span className="font-semibold text-purple-800">
                                    {avgTimeDays} дн.
                                </span>
                            </p>
                        )}

                        <p className="text-sm text-gray-700">
                            Найбільше часу у статусі:{' '}
                            <span className="font-semibold text-purple-800">
                                {mostFrequentStatus} ({mostFrequentDays} дн.)
                            </span>
                        </p>

                        <p className="text-sm text-gray-700">
                            Останній статус:{' '}
                            <span className="font-semibold text-blue-700">{lastStatus}</span> з{' '}
                            <span className="text-gray-500">{lastStatusDate}</span>
                        </p>
                    </div>

                    {/* === GROUPED STATUS LIST === */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-600 mb-3">
                            Детально по кожному статусу:
                        </h3>

                        {groupedArray.length === 0 ? (
                            <p className="text-gray-400 italic">Немає даних про статуси</p>
                        ) : (
                            <ul className="space-y-4">
                                {groupedArray.map((entry, idx) => (
                                    <li
                                        key={idx}
                                        className="p-4 rounded-md border border-gray-200 bg-gray-50 shadow-sm hover:shadow-md transition"
                                    >
                                        {/* Status Name */}
                                        <h4 className="text-sm font-bold text-purple-800 mb-1">
                                            {entry.status}
                                        </h4>

                                        {/* Periods */}
                                        <div className="text-xs text-gray-600 mb-2">
                                            <span className="font-medium">Періоди:</span>{' '}
                                            {entry.periods.map((p, i) => (
                                                <span key={i} className="inline-flex items-center">
                                                    {p.start.toLocaleDateString()}{' '}
                                                    <ArrowRight className="w-3 h-3 mx-1" />
                                                    {p.end.toLocaleDateString()}
                                                    {i < entry.periods.length - 1 && ', '}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Summary */}
                                        <div className="flex flex-wrap gap-3 text-xs text-gray-700">
                                            <span className="bg-gray-100 px-2 py-1 rounded-md border">
                                                Унікальних днів: <strong>{entry.uniqueDays}</strong>
                                            </span>
                                            <span className="bg-gray-100 px-2 py-1 rounded-md border">
                                                Кількість переходів:{' '}
                                                <strong>{entry.periods.length}</strong>
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
