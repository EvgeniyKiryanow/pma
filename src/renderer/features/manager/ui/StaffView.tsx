import { Loader2, UserRoundX } from 'lucide-react';
import { type ReactNode, useMemo } from 'react';

import type { User } from '../../../../shared/types/user';
import type { ShtatnaPosada } from '../../../entities/shtatna-posada/model/useShtatniStore';
import { StatusDot } from '../../../shared/components/StatusBadge';
import { cn, EmptyState } from '../../../shared/ui';
import { buildAlternateReport } from '../../report/model/alternateReport';

type Props = {
    users: User[];
    positions: ShtatnaPosada[];
    search: string;
    selectedId: number | null;
    loadingId: number | null;
    onSelect: (user: User) => void;
};

const byNumber = (a: ShtatnaPosada, b: ShtatnaPosada) =>
    String(a.shtat_number).localeCompare(String(b.shtat_number), 'uk', { numeric: true });

/**
 * «Штат»: the positions of the БЧС by subunit, in the order of the reports, with who holds
 * each one; vacancies are marked. People on the list without a position come last.
 */
export default function StaffView({
    users,
    positions,
    search,
    selectedId,
    loadingId,
    onSelect,
}: Props) {
    const groups = useMemo(() => {
        const report = buildAlternateReport(users, positions);
        const holders = new Map<string, User>();
        for (const user of users) {
            if (report.positionOf.has(user.id)) holders.set(String(user.shpkNumber), user);
        }
        const matches = (pos: ShtatnaPosada, holder?: User) =>
            !search ||
            [pos.shtat_number, pos.position_name, holder?.fullName, holder?.rank]
                .join(' ')
                .toLowerCase()
                .includes(search);

        const units = report.rows
            .filter((row) => row.kind !== 'total' && row.positions.length > 0)
            .map((row) => {
                const all = [...(row.positions as ShtatnaPosada[])].sort(byNumber);
                const items = all
                    .map((pos) => ({ pos, holder: holders.get(String(pos.shtat_number)) }))
                    .filter(({ pos, holder }) => matches(pos, holder));
                const vacant = all.filter((pos) => !holders.has(String(pos.shtat_number))).length;
                return { name: row.name, total: all.length, vacant, items };
            })
            .filter((group) => group.items.length > 0);

        const withoutPosition = users.filter(
            (user) =>
                !report.positionOf.has(user.id) &&
                (!search || `${user.fullName} ${user.rank}`.toLowerCase().includes(search)),
        );
        return { units, withoutPosition };
    }, [users, positions, search]);

    if (positions.length === 0) {
        return (
            <EmptyState
                title="БЧС ще не завантажено"
                description="Завантажте БЧС у «Таблиці та Excel» — тут зʼявляться посади."
            />
        );
    }
    if (groups.units.length === 0 && groups.withoutPosition.length === 0) {
        return <EmptyState title="Нічого не знайдено" description="Спробуйте інший запит." />;
    }

    /** The whole row opens the card: position line and name alike. */
    const row = (user: User, title: ReactNode) => (
        <button
            onClick={() => onSelect(user)}
            disabled={loadingId === user.id}
            className={cn(
                'block w-full rounded-lg px-2 py-1.5 text-left transition-colors',
                selectedId === user.id ? 'bg-primary-soft' : 'hover:bg-surface-2',
            )}
        >
            {title}
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
                {loadingId === user.id ? (
                    <Loader2 className="size-3 shrink-0 animate-spin" />
                ) : (
                    <StatusDot status={user.soldierStatus} />
                )}
                <span
                    className={cn(
                        'truncate text-[13px] font-medium',
                        selectedId === user.id ? 'text-primary-ink' : 'text-ink',
                    )}
                >
                    {user.fullName}
                </span>
            </span>
        </button>
    );

    const positionLine = (pos: ShtatnaPosada) => (
        <span className="flex items-baseline gap-2 text-xs text-ink-3">
            <span className="font-mono tabular-nums">№{pos.shtat_number}</span>
            <span className="truncate">{pos.position_name || '—'}</span>
        </span>
    );

    return (
        <div className="space-y-4 p-2">
            {groups.units.map((group) => (
                <section key={group.name}>
                    <h3 className="sticky top-0 z-[1] flex items-baseline justify-between gap-2 bg-surface px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink-2">
                        <span className="truncate">{group.name}</span>
                        <span className="shrink-0 font-normal normal-case tracking-normal text-ink-3">
                            {group.total} пос.{group.vacant > 0 && ` · вакантних ${group.vacant}`}
                        </span>
                    </h3>
                    <ul className="space-y-0.5">
                        {group.items.map(({ pos, holder }) => (
                            <li key={pos.shtat_number}>
                                {holder ? (
                                    row(holder, positionLine(pos))
                                ) : (
                                    <div className="px-2 py-1.5">
                                        {positionLine(pos)}
                                        <span className="mt-0.5 inline-block rounded-md bg-warning-soft px-1.5 py-0.5 text-[11px] font-medium text-warning-ink">
                                            Вакантна
                                        </span>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
            {groups.withoutPosition.length > 0 && (
                <section>
                    <h3 className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink-2">
                        <UserRoundX className="size-3.5" />
                        Без посади · {groups.withoutPosition.length}
                    </h3>
                    <ul className="space-y-0.5">
                        {groups.withoutPosition.map((user) => (
                            <li key={user.id}>{row(user, null)}</li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
