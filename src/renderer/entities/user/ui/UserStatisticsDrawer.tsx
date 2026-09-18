import { ArrowRight, BarChart2, Briefcase, Clock, RefreshCw } from 'lucide-react';
import { type ReactNode, useMemo } from 'react';

import type { User } from '../../../../shared/types/user';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Drawer, EmptyState, formatDate } from '../../../shared/ui';

type Props = {
    user: User;
    onClose: () => void;
};

const DAY_MS = 1000 * 60 * 60 * 24;

function StatTile({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
    return (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-3 [&_svg]:size-3.5">
                {icon}
                {label}
            </div>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums text-ink">{value}</p>
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-2.5">
            <h4 className="eyebrow">{title}</h4>
            {children}
        </section>
    );
}

export default function UserStatisticsDrawer({ user, onClose }: Props) {
    const stats = useMemo(() => {
        const history = user.history || [];

        const statusHistory = history
            .filter((h) => h.type === 'statusChange')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const posadaHistory = history
            .filter(
                (h) =>
                    h.description?.includes('Призначено на посаду') ||
                    h.description?.includes('Переміщено з посади') ||
                    h.description?.includes('звільнено з посади'),
            )
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Average time between status changes
        let avgStatusChangeDays: number | null = null;
        if (statusHistory.length > 1) {
            let totalDiffMs = 0;
            for (let i = 0; i < statusHistory.length - 1; i++) {
                totalDiffMs +=
                    new Date(statusHistory[i + 1].date).getTime() -
                    new Date(statusHistory[i].date).getTime();
            }
            avgStatusChangeDays = Math.max(
                1,
                Math.round(totalDiffMs / (statusHistory.length - 1) / DAY_MS),
            );
        }

        // Periods spent in each status: from its change until the next change (or today).
        const statusPeriods: { status: string; start: Date; end: Date }[] = [];
        for (let i = 0; i < statusHistory.length; i++) {
            const match = statusHistory[i].description?.match(/"(.+?)"\s*→\s*"(.+?)"/);
            const newStatus = match ? match[2] : null;
            if (!newStatus) continue;
            const start = new Date(statusHistory[i].date);
            const end =
                i < statusHistory.length - 1 ? new Date(statusHistory[i + 1].date) : new Date();
            statusPeriods.push({ status: newStatus, start, end });
        }

        const usage = new Map<string, { days: number; periods: { start: Date; end: Date }[] }>();
        for (const period of statusPeriods) {
            const item = usage.get(period.status) ?? { days: 0, periods: [] };
            item.days += Math.max(0, (period.end.getTime() - period.start.getTime()) / DAY_MS);
            item.periods.push({ start: period.start, end: period.end });
            usage.set(period.status, item);
        }
        const groupedStatusUsage = [...usage.entries()]
            .map(([status, info]) => ({
                status,
                days: Math.round(info.days),
                periods: info.periods,
            }))
            .sort((a, b) => b.days - a.days);

        // Position changes
        const posadaPeriods: { posada: string; start: Date; end: Date }[] = [];
        const counts: Record<string, number> = {};
        for (let i = 0; i < posadaHistory.length; i++) {
            const d = posadaHistory[i].description || '';
            const start = new Date(posadaHistory[i].date);
            const end =
                i < posadaHistory.length - 1 ? new Date(posadaHistory[i + 1].date) : new Date();

            let newPosada: string | null = null;
            if (d.includes('Переміщено з посади')) {
                const match = d.match(/Переміщено з посади (.+?) → (.+)/);
                if (match) newPosada = match[2].trim();
            } else if (d.includes('Призначено на посаду')) {
                newPosada = d.replace('Призначено на посаду', '').trim();
            } else if (d.includes('звільнено з посади')) {
                newPosada = '— (прибрано)';
            }

            if (newPosada) {
                posadaPeriods.push({ posada: newPosada, start, end });
                counts[newPosada] = (counts[newPosada] || 0) + 1;
            }
        }
        const topPositions = Object.entries(counts).sort((a, b) => b[1] - a[1]);

        const last = statusPeriods[statusPeriods.length - 1];
        return {
            totalStatusChanges: statusHistory.length,
            totalPosadaChanges: posadaHistory.length,
            avgStatusChangeDays,
            groupedStatusUsage,
            posadaPeriods,
            topPositions,
            lastStatus: last?.status ?? user.soldierStatus ?? null,
            lastStatusSince: last ? formatDate(last.start) : null,
            lastPosada: posadaPeriods[posadaPeriods.length - 1]?.posada ?? user.position ?? null,
        };
    }, [user]);

    const maxDays = Math.max(1, ...stats.groupedStatusUsage.map((s) => s.days));

    return (
        <Drawer open onClose={onClose} title="Статистика" icon={<BarChart2 />} width="w-[480px]">
            <div className="space-y-6">
                <p className="-mt-1 text-sm text-ink-3">{user.fullName}</p>

                <div className="grid grid-cols-3 gap-2">
                    <StatTile
                        label="Статусів"
                        value={stats.totalStatusChanges}
                        icon={<RefreshCw />}
                    />
                    <StatTile
                        label="Інтервал"
                        value={
                            stats.avgStatusChangeDays !== null ? (
                                <>
                                    {stats.avgStatusChangeDays}
                                    <span className="ml-1 text-sm font-normal text-ink-3">дн.</span>
                                </>
                            ) : (
                                '—'
                            )
                        }
                        icon={<Clock />}
                    />
                    <StatTile label="Посад" value={stats.totalPosadaChanges} icon={<Briefcase />} />
                </div>

                <Section title="Зараз">
                    <div className="space-y-2 rounded-xl border border-line p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <StatusBadge status={stats.lastStatus} size="md" />
                            {stats.lastStatusSince && (
                                <span className="text-xs text-ink-3">
                                    з {stats.lastStatusSince}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-ink-2">
                            Посада:{' '}
                            <span className="font-medium text-ink">{stats.lastPosada || '—'}</span>
                        </p>
                    </div>
                </Section>

                <Section title="Час у статусах">
                    {stats.groupedStatusUsage.length === 0 ? (
                        <EmptyState title="Немає даних про статуси" className="py-6" />
                    ) : (
                        <ul className="space-y-3">
                            {stats.groupedStatusUsage.map((entry) => (
                                <li key={entry.status} className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <StatusBadge status={entry.status} />
                                        <span className="shrink-0 text-xs font-medium tabular-nums text-ink-2">
                                            {entry.days} дн.
                                        </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                                        <div
                                            className="h-full rounded-full bg-primary"
                                            style={{ width: `${(entry.days / maxDays) * 100}%` }}
                                        />
                                    </div>
                                    <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-3">
                                        {entry.periods.map((p, i) => (
                                            <li key={i} className="inline-flex items-center gap-1">
                                                {formatDate(p.start)}
                                                <ArrowRight className="size-3" />
                                                {formatDate(p.end)}
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                {stats.posadaPeriods.length > 0 && (
                    <Section title="Історія посад">
                        <ul className="space-y-1.5">
                            {stats.posadaPeriods.map((p, idx) => (
                                <li
                                    key={idx}
                                    className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs"
                                >
                                    <Briefcase className="size-3.5 shrink-0 text-ink-3" />
                                    <span className="min-w-0 flex-1 truncate font-medium text-ink">
                                        {p.posada}
                                    </span>
                                    <span className="shrink-0 tabular-nums text-ink-3">
                                        {formatDate(p.start)} – {formatDate(p.end)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {stats.topPositions.length > 1 && (
                            <p className="text-xs text-ink-3">
                                Найчастіше: {stats.topPositions[0][0]} ({stats.topPositions[0][1]})
                            </p>
                        )}
                    </Section>
                )}
            </div>
        </Drawer>
    );
}
