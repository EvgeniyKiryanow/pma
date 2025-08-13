/* eslint-disable react-hooks/rules-of-hooks */
import { ArrowRight, BarChart2, Briefcase, Clock, RefreshCcw, X } from 'lucide-react';
import { useMemo } from 'react';

import type { User } from '../../../../types/user';

type Props = {
    user: User;
    onClose: () => void;
};

export default function UserStatisticsDrawer({ user, onClose }: Props) {
    if (!user) return null;

    const history = user.history || [];

    // ✅ Separate histories
    const statusHistory = history.filter((h) => h.type === 'statusChange');
    const posadaHistory = history.filter(
        (h) =>
            h.description?.includes('Призначено на посаду') ||
            h.description?.includes('Переміщено з посади') ||
            h.description?.includes('звільнено з посади'),
    );

    // Sort by date ASC
    statusHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    posadaHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalStatusChanges = statusHistory.length;
    const totalPosadaChanges = posadaHistory.length;

    // ✅ Average time between status changes
    let avgStatusChangeDays: number | null = null;
    if (totalStatusChanges > 1) {
        let totalDiffMs = 0;
        for (let i = 0; i < totalStatusChanges - 1; i++) {
            totalDiffMs +=
                new Date(statusHistory[i + 1].date).getTime() -
                new Date(statusHistory[i].date).getTime();
        }
        avgStatusChangeDays = Math.max(
            1,
            Math.round(totalDiffMs / (totalStatusChanges - 1) / (1000 * 60 * 60 * 24)),
        );
    }

    // ✅ Extract periods for each status
    const statusPeriods: { status: string; start: Date; end: Date }[] = [];
    for (let i = 0; i < statusHistory.length; i++) {
        const match = statusHistory[i].description?.match(/"(.+?)"\s*→\s*"(.+?)"/);
        const newStatus = match ? match[2] : null;
        if (!newStatus) continue;
        const start = new Date(statusHistory[i].date);
        const nextChangeDate =
            i < statusHistory.length - 1 ? new Date(statusHistory[i + 1].date) : new Date();
        statusPeriods.push({ status: newStatus, start, end: nextChangeDate });
    }

    // ✅ Group by status usage
    const groupedStatusUsage = useMemo(() => {
        const usage: Record<
            string,
            { uniqueDays: Set<string>; periods: { start: Date; end: Date }[] }
        > = {};
        statusPeriods.forEach((period) => {
            const key = period.status;
            if (!usage[key]) {
                usage[key] = { uniqueDays: new Set(), periods: [] };
            }
            usage[key].periods.push({ start: period.start, end: period.end });
            usage[key].uniqueDays.add(period.start.toISOString().split('T')[0]);
        });
        return Object.entries(usage)
            .map(([status, info]) => ({
                status,
                uniqueDays: info.uniqueDays.size,
                periods: info.periods,
            }))
            .sort((a, b) => b.uniqueDays - a.uniqueDays);
    }, [statusPeriods]);

    const mostFrequentStatus = groupedStatusUsage[0]?.status || '—';
    const mostFrequentStatusDays = groupedStatusUsage[0]?.uniqueDays || 0;

    // ✅ Analyze POSADA changes
    const posadaStats = useMemo(() => {
        const periods: { posada: string; start: Date; end: Date }[] = [];
        const counts: Record<string, number> = {};

        for (let i = 0; i < posadaHistory.length; i++) {
            const d = posadaHistory[i].description || '';
            const startDate = new Date(posadaHistory[i].date);
            const nextDate =
                i < posadaHistory.length - 1 ? new Date(posadaHistory[i + 1].date) : new Date();

            let newPosada: string | null = null;
            if (d.includes('Переміщено з посади')) {
                const match = d.match(/Переміщено з посади (.+?) → (.+)/);
                if (match) {
                    newPosada = match[2].trim();
                }
            } else if (d.includes('Призначено на посаду')) {
                newPosada = d.replace('Призначено на посаду', '').trim();
            } else if (d.includes('звільнено з посади')) {
                newPosada = '— (прибрано)';
            }

            if (newPosada) {
                periods.push({ posada: newPosada, start: startDate, end: nextDate });
                counts[newPosada] = (counts[newPosada] || 0) + 1;
            }
        }

        const grouped = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return {
            total: posadaHistory.length,
            periods,
            mostFrequent: grouped[0]?.[0] || '—',
            topCounts: grouped,
        };
    }, [posadaHistory]);

    const lastStatus =
        statusPeriods.length > 0
            ? statusPeriods[statusPeriods.length - 1].status
            : user.soldierStatus || '—';
    const lastStatusDate =
        statusPeriods.length > 0
            ? statusPeriods[statusPeriods.length - 1].start.toLocaleDateString()
            : '—';

    const lastPosada =
        posadaStats.periods.length > 0
            ? posadaStats.periods[posadaStats.periods.length - 1].posada
            : '—';

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

            {/* Drawer */}
            <div className="fixed top-0 right-0 h-full w-[30%] min-w-[360px] bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col animate-slide-in">
                {/* Header */}
                <div className="flex justify-between items-center px-5 py-4 border-b bg-gradient-to-r from-purple-50 to-purple-100">
                    <h2 className="text-lg font-bold text-purple-800 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5" /> Розширена статистика користувача
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
                    {/* STATUS SUMMARY */}
                    <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 shadow-sm space-y-2">
                        <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                            📌 Статуси
                        </h3>
                        <p className="text-sm text-gray-700">
                            Всього змін статусу:{' '}
                            <span className="font-semibold text-purple-800">
                                {totalStatusChanges}
                            </span>
                        </p>

                        {avgStatusChangeDays !== null && (
                            <p className="text-sm text-gray-700 flex items-center gap-1">
                                <Clock className="w-4 h-4 text-purple-600" />
                                Середній час між змінами:{' '}
                                <span className="font-semibold text-purple-800">
                                    {avgStatusChangeDays} дн.
                                </span>
                            </p>
                        )}

                        <p className="text-sm text-gray-700">
                            Найбільше часу у статусі:{' '}
                            <span className="font-semibold text-purple-800">
                                {mostFrequentStatus} ({mostFrequentStatusDays} дн.)
                            </span>
                        </p>

                        <p className="text-sm text-gray-700">
                            Останній статус:{' '}
                            <span className="font-semibold text-blue-700">{lastStatus}</span> з{' '}
                            <span className="text-gray-500">{lastStatusDate}</span>
                        </p>
                    </div>

                    {/* POSADA SUMMARY */}
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 shadow-sm space-y-2">
                        <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                            <Briefcase className="w-5 h-5" /> Посади
                        </h3>

                        <p className="text-sm text-gray-700">
                            Всього змін посад:{' '}
                            <span className="font-semibold text-blue-800">
                                {totalPosadaChanges}
                            </span>
                        </p>

                        <p className="text-sm text-gray-700">
                            Найчастіше займав:{' '}
                            <span className="font-semibold text-blue-800">
                                {posadaStats.mostFrequent}
                            </span>{' '}
                            ({posadaStats.topCounts[0]?.[1] || 0} разів)
                        </p>

                        <p className="text-sm text-gray-700">
                            Поточна посада:{' '}
                            <span className="font-semibold text-green-700">{lastPosada}</span>
                        </p>

                        {posadaStats.topCounts.length > 1 && (
                            <div className="text-xs text-gray-600 mt-2">
                                <strong>Інші посади:</strong>{' '}
                                {posadaStats.topCounts
                                    .slice(1)
                                    .map(([pos, count]) => `${pos} (${count})`)
                                    .join(', ')}
                            </div>
                        )}
                    </div>

                    {/* DETAILED TIMELINES */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-600 mb-3">
                            Детальні періоди:
                        </h3>

                        {/* Status Periods */}
                        {groupedStatusUsage.length === 0 ? (
                            <p className="text-gray-400 italic">Немає даних про статуси</p>
                        ) : (
                            <ul className="space-y-3">
                                {groupedStatusUsage.map((entry, idx) => (
                                    <li
                                        key={idx}
                                        className="p-3 rounded-md border border-gray-200 bg-gray-50 shadow-sm hover:shadow-md transition"
                                    >
                                        <h4 className="text-sm font-bold text-purple-800 mb-1">
                                            {entry.status}
                                        </h4>
                                        {entry.periods.map((p, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center text-xs text-gray-600"
                                            >
                                                {p.start.toLocaleDateString()}{' '}
                                                <ArrowRight className="w-3 h-3 mx-1" />
                                                {p.end.toLocaleDateString()}
                                            </div>
                                        ))}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Posada Periods */}
                        {posadaStats.periods.length > 0 && (
                            <>
                                <h4 className="mt-4 mb-2 text-sm font-semibold text-blue-700">
                                    Історія посад:
                                </h4>
                                <ul className="space-y-2">
                                    {posadaStats.periods.map((p, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-center text-xs bg-blue-50 border border-blue-200 rounded-md px-3 py-2"
                                        >
                                            <RefreshCcw className="w-3 h-3 mr-2 text-blue-600" />
                                            <span className="font-medium">{p.posada}</span>
                                            <span className="ml-auto text-gray-600">
                                                {p.start.toLocaleDateString()}{' '}
                                                <ArrowRight className="w-3 h-3 inline-block mx-1" />
                                                {p.end.toLocaleDateString()}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
