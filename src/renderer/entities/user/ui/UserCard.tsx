import { Phone } from 'lucide-react';
import type { ReactNode } from 'react';

import type { User } from '../../../../shared/types/user';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Avatar } from '../../../shared/ui';

/** Human-readable staffing number (the stored value also encodes order/excluded states). */
export function formatShpkNumber(value: string | null | undefined): string | null {
    if (!value) return null;
    if (value === 'excluded') return 'Виключений';
    if (value === 'order') return 'У розпорядженні';
    if (value.includes('order')) return `${value.replace(/_?order_?/, '')} · у розпорядженні`;
    return value;
}

/** Identity block of the dossier: photo, name, rank/position/unit and the current status. */
export default function UserCard({ user, actions }: { user: User; actions?: ReactNode }) {
    const meta = [user.rank, user.position, user.unitMain].filter(Boolean);

    return (
        <div className="flex flex-wrap items-start gap-x-5 gap-y-4">
            <Avatar
                name={user.fullName}
                src={user.photo}
                size={76}
                rounded="rounded-2xl"
                className="shadow-card ring-4 ring-surface"
            />
            <div className="min-w-[240px] flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="text-[22px] font-semibold leading-tight text-ink">
                        {user.fullName}
                    </h2>
                    {user.callsign && (
                        <span className="rounded-md border border-brass/40 bg-brass-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-brass-ink">
                            «{user.callsign}»
                        </span>
                    )}
                </div>
                {meta.length > 0 && (
                    <p className="mt-1 text-sm text-ink-2">
                        {meta.map((part, i) => (
                            <span key={i}>
                                {i > 0 && <span className="mx-1.5 text-ink-3">·</span>}
                                {part}
                            </span>
                        ))}
                    </p>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <StatusBadge status={user.soldierStatus} size="md" />
                    {!!user.isAttached && (
                        <span className="rounded-full border border-brass/40 bg-brass-soft px-2.5 py-1 text-[13px] font-medium text-brass-ink">
                            Прикомандирований{user.attachedFrom ? ` · ${user.attachedFrom}` : ''}
                        </span>
                    )}
                    {user.phoneNumber && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[13px] text-ink-2">
                            <Phone className="size-3.5 text-ink-3" />
                            {user.phoneNumber}
                        </span>
                    )}
                </div>
            </div>
            {actions && <div className="flex w-full flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
